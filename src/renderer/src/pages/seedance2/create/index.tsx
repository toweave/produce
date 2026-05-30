import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TwoColumnLayout } from '@/components/two-column-layout'
import { CreateForm, type CreateFormMeta } from './components/create-form'
import { KeyframeGrid } from './components/keyframe-grid'
import VideoPlayer from '@/components/video-player'
import { useFormPersistence } from './hooks/use-form-persistence'
import { useSessionRestore } from './hooks/use-session-restore'
import { useSeedance2CreateStore } from '@/stores/seedance2-create-store'
import type { TaskDetail } from '../types'

const STORAGE_DIRS_KEY = 'seedance2-storage-dirs'
const STORAGE_CURRENT_KEY = 'seedance2-storage-current'
const STORAGE_LAST_SESSION_KEY = 'seedance2-last-session'

/** Send a system desktop notification */
function sendNotification(title: string, body: string): void {
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') new Notification(title, { body })
        })
      }
    }
  } catch { /* Notification API not available */ }
}

export default function Seedance2CreatePage(): React.JSX.Element {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const lastSessionRef = useRef<string | null>(null)

  // Storage directories (local UI state, passed to CreateForm)
  const [storageDir, setStorageDir] = useState('')
  const [storageDirs, setStorageDirs] = useState<string[]>([])
  const lastMetaRef = useRef<CreateFormMeta | null>(null)
  const storageDirRef = useRef(storageDir)
  storageDirRef.current = storageDir

  // Track current genMode from CreateForm for frame capture routing
  const [currentGenMode, setCurrentGenMode] = useState<string>('multi-modal-ref')
  const [capturedFrameAction, setCapturedFrameAction] = useState<{
    type: 'first-frame' | 'last-frame' | 'reference-image'
    dataUrl: string
  } | null>(null)

  // Form state for persistence
  const [formState, setFormState] = useState({
    prompt: '', ratio: 'adaptive', duration: 5, resolution: '720p',
    generateAudio: true, watermark: false, genMode: 'multi-modal-ref'
  })
  const [firstFrameData, setFirstFrameData] = useState<string | null>(null)
  const [lastFrameDataLF, setLastFrameDataLF] = useState<string | null>(null)

  // Restored form params from last session
  const [initialFormParams, setInitialFormParams] = useState<CreateFormMeta | null | undefined>(undefined)

  // Initialize storage directories from localStorage or default
  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_DIRS_KEY)
        const savedCurrent = localStorage.getItem(STORAGE_CURRENT_KEY)
        if (saved && savedCurrent) {
          const dirs = JSON.parse(saved) as string[]
          setStorageDirs(dirs)
          setStorageDir(savedCurrent)
        } else {
          const defaultPath = await window.api.file.getDefaultPath()
          setStorageDirs([defaultPath])
          setStorageDir(defaultPath)
          localStorage.setItem(STORAGE_DIRS_KEY, JSON.stringify([defaultPath]))
          localStorage.setItem(STORAGE_CURRENT_KEY, defaultPath)
        }
      } catch { /* ignore */ }
    }
    init()
  }, [])

  const handleStorageChange = useCallback(async (val: string) => {
    if (val === '__add__') {
      const dir = await window.api.dialog.selectDirectory()
      if (!dir) return
      setStorageDirs((prev) => {
        if (!prev.includes(dir)) {
          const newDirs = [...prev, dir]
          localStorage.setItem(STORAGE_DIRS_KEY, JSON.stringify(newDirs))
          return newDirs
        }
        return prev
      })
      setStorageDir(dir)
      localStorage.setItem(STORAGE_CURRENT_KEY, dir)
    } else {
      setStorageDir(val)
      localStorage.setItem(STORAGE_CURRENT_KEY, val)
    }
  }, [])

  // Form persistence
  useFormPersistence({
    formState,
    update: (partial) => setFormState((prev) => ({ ...prev, ...partial })),
    isFirstFrameMode: formState.genMode === 'first-frame',
    isFirstLastFrameMode: formState.genMode === 'first-last-frame',
    firstFrameData,
    firstFramePath: '',
    lastFrameData: lastFrameDataLF,
    lastFramePath: ''
  })

  // Session restore
  const handleSessionRestore = useCallback((data: {
    createdId: string
    videoUrl: string
    storageDir: string
    formParams?: Record<string, unknown> | null
  }) => {
    if (data.createdId && data.createdId !== lastSessionRef.current) {
      lastSessionRef.current = data.createdId
      useSeedance2CreateStore.getState().update({
        createdId: data.createdId,
        videoUrl: data.videoUrl
      })
      if (data.storageDir) {
        setStorageDir(data.storageDir)
        localStorage.setItem(STORAGE_CURRENT_KEY, data.storageDir)
      }
      if (data.formParams) {
        setInitialFormParams(data.formParams as unknown as CreateFormMeta)
      }
    }
  }, [])

  const handleKeyframesRestore = useCallback((frames: string[]) => {
    if (frames.length > 0) {
      useSeedance2CreateStore.getState().update({ manualKeyframes: frames })
    }
  }, [])

  useSessionRestore(storageDir, {
    onRestore: handleSessionRestore,
    onKeyframesRestore: handleKeyframesRestore
  })

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const pollTask = useCallback(async (taskId: string) => {
    // Try loading local file first — already downloaded from a previous session
    const tryLocalFile = async (): Promise<boolean> => {
      try {
        const localPath = await window.api.file.downloadVideo({
          url: '',
          destDir: storageDirRef.current,
          filename: `Seedance2_${taskId}`,
          taskId
        })
        const buffer = await window.api.file.readFileBuffer(localPath)
        const blob = new Blob([buffer], { type: 'video/mp4' })
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = URL.createObjectURL(blob)
        useSeedance2CreateStore.getState().update({ videoUrl: blobUrlRef.current })
        return true
      } catch {
        return false
      }
    }

    // Check local file first
    if (await tryLocalFile()) {
      useSeedance2CreateStore.getState().update({ taskStatus: 'succeeded' })
      return
    }

    // No local file — poll API every 5s for up to 5 minutes
    const MAX_RETRIES = 60
    let stopped = false
    let succeededWithoutUrl = false

    for (let retry = 0; retry < MAX_RETRIES && !stopped; retry++) {
      await new Promise((r) => setTimeout(r, 5000))
      try {
        const result = await window.api.seedance2.getTask(taskId) as TaskDetail
        const status = result.status || ''
        useSeedance2CreateStore.getState().update({ taskStatus: status })

        if (status === 'succeeded') {
          const remoteUrl = result.content?.video_url
          if (remoteUrl) {
            stopped = true
            sendNotification('Seedance 2.0 视频生成完成', `任务 ${taskId.slice(0, 20)}… 已成功生成`)

            // Save session data immediately (before slow download), including form params for restore
            const sessionBase = { taskId, remoteUrl, dir: storageDirRef.current, formParams: lastMetaRef.current || undefined }
            localStorage.setItem(
              STORAGE_LAST_SESSION_KEY,
              JSON.stringify({ ...sessionBase, localPath: '' })
            )

            // Try to download first → show local blob URL
            try {
              const localPath = await window.api.file.downloadVideo({
                url: remoteUrl,
                destDir: storageDirRef.current,
                filename: `Seedance2_${taskId}`,
                taskId
              })
              const buffer = await window.api.file.readFileBuffer(localPath)
              const blob = new Blob([buffer], { type: 'video/mp4' })
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
              blobUrlRef.current = URL.createObjectURL(blob)
              useSeedance2CreateStore.getState().update({ videoUrl: blobUrlRef.current })
              // Update localStorage with local path once download completes
              localStorage.setItem(
                STORAGE_LAST_SESSION_KEY,
                JSON.stringify({ ...sessionBase, localPath })
              )
            } catch {
              // Fall back to remote URL if download fails
              useSeedance2CreateStore.getState().update({ videoUrl: remoteUrl })
            }
          } else {
            // Status is 'succeeded' but no video URL yet — continue polling
            succeededWithoutUrl = true
          }
        } else if (status === 'failed') {
          stopped = true
          sendNotification('Seedance 2.0 视频生成失败', `任务 ${taskId.slice(0, 20)}… 生成失败，请检查参数后重试`)
          const errObj = result.error
          useSeedance2CreateStore.getState().update({
            pollError: errObj?.message ? String(errObj.message) : '视频生成失败'
          })
        } else if (status === 'cancelled' || status === 'expired') {
          stopped = true
          useSeedance2CreateStore.getState().update({
            pollError: `任务已${status === 'cancelled' ? '取消' : '过期'}`
          })
        }
      } catch {
        if (retry >= MAX_RETRIES - 1) {
          stopped = true
          useSeedance2CreateStore.getState().update({ pollError: '查询任务状态失败，请检查网络后重试' })
        }
      }
    }

    if (!stopped) {
      if (succeededWithoutUrl) {
        useSeedance2CreateStore.getState().update({
          pollError: '视频已生成但获取播放地址超时，请到任务列表中查看'
        })
      } else {
        useSeedance2CreateStore.getState().update({
          pollError: '视频生成超时，请稍后查看任务列表'
        })
      }
    }
  }, [])

  const handleSubmit = useCallback(async (apiParams: Record<string, unknown>, meta: CreateFormMeta) => {
    lastMetaRef.current = meta

    const result = await window.api.seedance2.createTask(apiParams) as { id: string }
    const id = result.id

    useSeedance2CreateStore.getState().update({
      createdId: id,
      taskStatus: 'queued',
      videoUrl: '',
      pollError: ''
    })

    // Save task params (best-effort) — use ref for fresh storageDir
    try {
      const dir = storageDirRef.current || await window.api.file.getDefaultPath()
      if (dir !== storageDirRef.current) {
        storageDirRef.current = dir
        setStorageDir(dir)
        localStorage.setItem(STORAGE_CURRENT_KEY, dir)
      }

      const firstFrameImg = meta.images?.[0]
      const firstFrameRelPath = firstFrameImg?.filePath
        ? await window.api.path.relative(dir, firstFrameImg.filePath).catch(() => null)
        : null
      const lastFrameRelPath = meta.generationMode === 'first-last-frame'
        ? (meta.images?.[1]?.filePath
            ? await window.api.path.relative(dir, meta.images[1].filePath).catch(() => null)
            : null)
        : null

      const imageRefs = meta.generationMode === 'multi-modal-ref'
        ? await Promise.all(
            meta.images.map(async (img) => ({
              name: img.name,
              relativePath: img.filePath ? await window.api.path.relative(dir, img.filePath).catch(() => null) : null
            }))
          )
        : []
      const videoRefs = meta.generationMode === 'multi-modal-ref'
        ? await Promise.all(
            meta.videos.map(async (v) => ({
              name: v.name,
              url: v.filePath ? null : v.dataUri || null,
              relativePath: v.filePath ? await window.api.path.relative(dir, v.filePath).catch(() => null) : null
            }))
          )
        : []
      const audioRefs = meta.generationMode === 'multi-modal-ref'
        ? await Promise.all(
            meta.audioFiles.map(async (a) => ({
              name: a.name,
              relativePath: a.filePath ? await window.api.path.relative(dir, a.filePath).catch(() => null) : null
            }))
          )
        : []

      await window.api.taskParams.save({
        task_id: id,
        version: '2.0',
        prompt: meta.prompt || null,
        ratio: meta.ratio,
        duration: meta.duration > 0 ? meta.duration : null,
        resolution: meta.resolution,
        generate_audio: meta.generateAudio ? 1 : 0,
        watermark: meta.watermark ? 1 : 0,
        model: meta.model,
        first_frame_path: firstFrameRelPath,
        last_frame_path: lastFrameRelPath,
        first_frame_data: (meta.generationMode === 'first-frame' || meta.generationMode === 'first-last-frame')
          ? (firstFrameImg?.dataUri || null)
          : null,
        last_frame_data: meta.generationMode === 'first-last-frame'
          ? (meta.images?.[1]?.dataUri || null)
          : null,
        full_params: JSON.stringify({
          generationMode: meta.generationMode,
          returnLastFrame: meta.returnLastFrame,
          webSearch: meta.webSearch,
          priority: meta.priority,
          seed: meta.seed,
          executionExpiresAfter: meta.executionExpiresAfter,
          callbackUrl: meta.callbackUrl,
          safetyIdentifier: meta.safetyIdentifier,
          references: meta.generationMode === 'multi-modal-ref'
            ? { images: imageRefs, videos: videoRefs, audioFiles: audioRefs }
            : undefined
        })
      })
    } catch {
      /* task params save is best-effort */
    }

    pollTask(id).catch(() => {})
    return { id }
  }, [pollTask])

  const handleReset = useCallback(() => {
    useSeedance2CreateStore.getState().resetPanel()
  }, [])

  const handleDeleteManualKeyframe = useCallback(async (index: number) => {
    useSeedance2CreateStore.getState().removeManualKeyframe(index)
  }, [])

  const handleClearAllKeyframes = useCallback(async () => {
    if (!window.confirm('确定清空所有关键帧？此操作不可撤销')) return
    useSeedance2CreateStore.getState().clearKeyframes()
  }, [])

  /** Track genMode changes from CreateForm */
  const handleGenModeChange = useCallback((mode: string) => {
    setCurrentGenMode(mode)
    setFormState((prev) => ({ ...prev, genMode: mode }))
  }, [])

  const handleSetFirstFrame = useCallback((dataUrl: string) => {
    setFirstFrameData(dataUrl)
    if (currentGenMode === 'first-frame' || currentGenMode === 'first-last-frame') {
      setCapturedFrameAction({ type: 'first-frame', dataUrl })
    } else if (currentGenMode === 'multi-modal-ref') {
      setCapturedFrameAction({ type: 'reference-image', dataUrl })
    }
  }, [currentGenMode])

  const handleSetLastFrame = useCallback((dataUrl: string) => {
    setLastFrameDataLF(dataUrl)
    if (currentGenMode === 'first-last-frame') {
      setCapturedFrameAction({ type: 'last-frame', dataUrl })
    } else if (currentGenMode === 'multi-modal-ref') {
      setCapturedFrameAction({ type: 'reference-image', dataUrl })
    }
  }, [currentGenMode])

  // Read keyframe/manualKeyframe counts from store for KeyframeGrid props
  const autoKeyframes = useSeedance2CreateStore((s) => s.autoKeyframes)
  const manualKeyframes = useSeedance2CreateStore((s) => s.manualKeyframes)
  const videoUrl = useSeedance2CreateStore((s) => s.videoUrl)
  const createdIdFromStore = useSeedance2CreateStore((s) => s.createdId)
  const taskStatus = useSeedance2CreateStore((s) => s.taskStatus)

  return (
    <TwoColumnLayout
      left={<CreateForm
        onSubmit={handleSubmit}
        storageDirs={storageDirs}
        currentDir={storageDir}
        onStorageChange={handleStorageChange}
        initialParams={initialFormParams}
        capturedFrame={capturedFrameAction}
        onGenModeChange={handleGenModeChange}
      />}
      right={
        <div className="flex flex-col gap-4 h-full overflow-y-auto">
          <VideoPlayer
            videoUrl={videoUrl}
            loading={!!createdIdFromStore && !videoUrl}
            loadingLabel={taskStatus === 'succeeded' ? '任务已完成，正在下载视频...' : '视频生成中...'}
            taskId={createdIdFromStore}
            storageDir={storageDir}
            videoRef={videoRef}
            versionPrefix="Seedance2_"
            onKeyframeCapture={(dataUrl) => {
              useSeedance2CreateStore.getState().addManualKeyframe(dataUrl)
            }}
          />
          <KeyframeGrid
            autoKeyframes={autoKeyframes}
            manualKeyframes={manualKeyframes}
            capturingAuto={false}
            hasVideo={!!videoUrl}
            onSetFirstFrame={handleSetFirstFrame}
            onSetLastFrame={currentGenMode !== 'first-frame' ? handleSetLastFrame : undefined}
            onDeleteManualKeyframe={handleDeleteManualKeyframe}
            onClearAllKeyframes={handleClearAllKeyframes}
          />
          {videoUrl && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/seedance2/tasks/${useSeedance2CreateStore.getState().createdId}`)}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                查看任务详情
              </button>
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                继续创作
              </button>
            </div>
          )}
        </div>
      }
    />
  )
}
