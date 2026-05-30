import React, { useEffect, useRef, useCallback, useState } from 'react'
import { Loader2Icon, ChevronRightIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TwoColumnLayout } from '@/components/two-column-layout'
import VideoPlayer from '@/components/video-player'
import { CreateForm, type CreateFormMeta } from './components/create-form'
import { KeyframeGrid } from './components/keyframe-grid'
import { useFormPersistence } from './hooks/use-form-persistence'
import { useSessionRestore } from './hooks/use-session-restore'
import { STATUS_LABEL } from '../constants'
import type { TaskDetail } from '../types'

const STORAGE_DIRS_KEY = 'seedance2-storage-dirs'
const STORAGE_CURRENT_KEY = 'seedance2-storage-current'

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

  // Task state
  const [createdId, setCreatedId] = useState('')
  const [taskStatus, setTaskStatus] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [pollError, setPollError] = useState('')
  const [keyframes, setKeyframes] = useState<string[]>([])
  const [storageDir, setStorageDir] = useState('')
  const [storageDirs, setStorageDirs] = useState<string[]>([])
  const lastMetaRef = useRef<CreateFormMeta | null>(null)

  /** Save the last session (video + form params) to localStorage */
  const saveSession = useCallback((taskId: string, localPath: string, remoteUrl: string) => {
    const session = {
      taskId,
      remoteUrl,
      localPath: localPath || undefined,
      dir: storageDir,
      formParams: lastMetaRef.current || undefined
    }
    localStorage.setItem('seedance2-last-session', JSON.stringify(session))
  }, [storageDir])

  // Restored form params from last session
  const [initialFormParams, setInitialFormParams] = useState<CreateFormMeta | null | undefined>(undefined)

  // Form state for persistence
  const [formState, setFormState] = useState({ prompt: '', ratio: 'adaptive', duration: 5, resolution: '720p', generateAudio: true, watermark: false, genMode: 'multi-modal-ref' })
  const [firstFrameData, setFirstFrameData] = useState<string | null>(null)
  const [lastFrameDataLF, setLastFrameDataLF] = useState<string | null>(null)

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
      setCreatedId(data.createdId)
      if (data.videoUrl) setVideoUrl(data.videoUrl)
      if (data.storageDir) {
        setStorageDir(data.storageDir)
        localStorage.setItem(STORAGE_CURRENT_KEY, data.storageDir)
      }
      // Restore form params into the form
      if (data.formParams) {
        setInitialFormParams(data.formParams as unknown as CreateFormMeta)
      }
    }
  }, [])

  const handleKeyframesRestore = useCallback((frames: string[]) => {
    if (frames.length > 0) setKeyframes(frames)
  }, [])

  useSessionRestore(storageDir, {
    onRestore: handleSessionRestore,
    onKeyframesRestore: handleKeyframesRestore
  })

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const pollTask = useCallback((taskId: string) => {
    let stopped = false
    const poll = async () => {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 5000))
        if (stopped) break
        try {
          const result = await window.api.seedance2.getTask(taskId) as TaskDetail
          const status = result.status || ''
          setTaskStatus(status)

          if (status === 'succeeded') {
            stopped = true
            sendNotification('Seedance 2.0 视频生成完成', `任务 ${taskId.slice(0, 20)}… 已成功生成`)
            const remoteUrl = result.content?.video_url
            if (remoteUrl) {
              try {
                const localPath = await window.api.file.downloadVideo({
                  url: remoteUrl,
                  destDir: storageDir,
                  filename: `Seedance2_${taskId}`,
                  taskId
                })
                const buffer = await window.api.file.readFileBuffer(localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                setVideoUrl(blobUrlRef.current)
                // Save last session with form params — loads when reopening the app
                saveSession(taskId, remoteUrl, localPath)
              } catch {
                setVideoUrl(remoteUrl)
                saveSession(taskId, remoteUrl, '')
              }
            }
          } else if (status === 'failed') {
            stopped = true
            sendNotification('Seedance 2.0 视频生成失败', `任务 ${taskId.slice(0, 20)}… 生成失败，请检查参数后重试`)
            const errObj = result.error
            setPollError(errObj?.message ? String(errObj.message) : '视频生成失败')
          } else if (status === 'cancelled' || status === 'expired') {
            stopped = true
            setPollError(`任务已${status === 'cancelled' ? '取消' : '过期'}`)
          }
        } catch {
          setPollError('查询任务状态失败')
          stopped = true
        }
      }
    }
    poll()
  }, [storageDir])

  const handleSubmit = useCallback(async (apiParams: Record<string, unknown>, meta: CreateFormMeta) => {
    // Keep meta for session save when the task completes
    lastMetaRef.current = meta

    const result = await window.api.seedance2.createTask(apiParams) as { id: string }
    const id = result.id
    setCreatedId(id)
    setTaskStatus('queued')
    setVideoUrl('')
    setPollError('')
    setKeyframes([])

    // Save task params (best-effort)
    try {
      const dir = storageDir || await window.api.file.getDefaultPath()

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

    pollTask(id)
    return { id }
  }, [pollTask, storageDir])

  const handleReset = useCallback(() => {
    setCreatedId('')
    setTaskStatus('')
    setVideoUrl('')
    setPollError('')
    setKeyframes([])
  }, [])

  const handleKeyframeCapture = useCallback((dataUrl: string) => {
    setKeyframes((prev) => [...prev, dataUrl])
    // Save manual keyframe to disk
    if (createdId && storageDir) {
      window.api.file.saveKeyframe({
        base64Data: dataUrl,
        destDir: storageDir,
        filename: `Seedance2_${createdId}_manual_${Date.now()}`
      }).catch(() => {})
    }
  }, [createdId, storageDir])

  const handleDeleteManualKeyframe = useCallback(async (index: number) => {
    // Remove from state (manual keyframes are appended after auto keyframes)
    setKeyframes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleClearAllKeyframes = useCallback(async () => {
    if (!window.confirm('确定清空所有关键帧？此操作不可撤销')) return
    setKeyframes([])
  }, [])

  const handleSetFirstFrame = useCallback((dataUrl: string) => {
    setFirstFrameData(dataUrl)
  }, [])

  const handleSetLastFrame = useCallback((dataUrl: string) => {
    setLastFrameDataLF(dataUrl)
  }, [])

  const handleDownload = useCallback(async () => {
    // Download is handled by VideoPlayer's onDownload
  }, [])

  const renderRight = () => {
    if (!createdId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[300px]">
          <ChevronRightIcon className="h-10 w-10" />
          <span className="text-sm">填写左侧参数后点击"生成视频"</span>
        </div>
      )
    }

    if (pollError && !videoUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px]">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive max-w-sm">
            {pollError}
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-primary hover:underline"
          >
            重新开始
          </button>
        </div>
      )
    }

    if (videoUrl) {
      return (
        <div className="flex-1 flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden w-full">
            <VideoPlayer
              videoRef={videoRef}
              videoUrl={videoUrl}
              taskId={createdId}
              storageDir={storageDir}
              versionPrefix="Seedance2_"
              onKeyframeCapture={handleKeyframeCapture}
              onDownload={handleDownload}
            />
          </div>

          {/* Keyframe Grid — keyframes are only added when user clicks the capture button */}
          <KeyframeGrid
            autoKeyframes={[]}
            manualKeyframes={keyframes}
            capturingAuto={false}
            hasVideo={!!videoUrl}
            onSetFirstFrame={handleSetFirstFrame}
            onSetLastFrame={handleSetLastFrame}
            onDeleteManualKeyframe={handleDeleteManualKeyframe}
            onClearAllKeyframes={handleClearAllKeyframes}
          />

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/seedance2/tasks/${createdId}`)}
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
        </div>
      )
    }

    // Loading / polling state
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[300px]">
        <Loader2Icon className="h-8 w-8 animate-spin" />
        <span className="text-sm">
          {taskStatus === 'queued' ? '任务排队中...' : '正在生成视频...'}
        </span>
        <span className="text-xs font-mono">ID: {createdId}</span>
        <span className="text-xs text-muted-foreground">
          状态：{STATUS_LABEL[taskStatus] || taskStatus}
        </span>
        <button
          onClick={() => navigate(`/seedance2/tasks/${createdId}`)}
          className="text-xs text-primary hover:underline mt-2"
        >
          查看任务详情
        </button>
      </div>
    )
  }

  return (
    <TwoColumnLayout
      left={<CreateForm
        onSubmit={handleSubmit}
        storageDirs={storageDirs}
        currentDir={storageDir}
        onStorageChange={handleStorageChange}
        initialParams={initialFormParams}
      />}
      right={<div className="flex flex-col gap-4 h-full">{renderRight()}</div>}
    />
  )
}
