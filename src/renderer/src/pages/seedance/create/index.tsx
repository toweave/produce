import React, { useEffect, useRef, useCallback } from 'react'
import { handleApiError } from '@/lib/api-errors'
import { TwoColumnLayout } from '@/components/two-column-layout'
import { CreateForm } from './components/create-form'
import { KeyframeGrid } from './components/keyframe-grid'
import VideoPlayer from '@/components/video-player'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'
import { useFormPersistence, useStorageInit } from './hooks/use-form-persistence'
import { useSessionRestore } from './hooks/use-session-restore'

const STORAGE_LAST_SESSION_KEY = 'seedance-last-session'

/** Save/update the last-session cache to localStorage */
function updateSessionCache(taskId: string, overrides: Record<string, unknown>): void {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
    const existing = raw ? JSON.parse(raw) : {}
    localStorage.setItem(
      STORAGE_LAST_SESSION_KEY,
      JSON.stringify({ ...existing, ...overrides, taskId, timestamp: Date.now() })
    )
  } catch { /* localStorage full — ignore */ }
}

export default function SeedanceCreatePage(): React.JSX.Element {
  // DOM refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  /** Set to true when push event arrives — tells pollTask to stop early */
  const stoppedRef = useRef(false)

  // Store selectors
  const currentDir = useSeedanceCreateStore((s) => s.currentDir)
  const videoUrl = useSeedanceCreateStore((s) => s.videoUrl)
  const pollError = useSeedanceCreateStore((s) => s.pollError)
  const createdId = useSeedanceCreateStore((s) => s.createdId)
  const taskStatus = useSeedanceCreateStore((s) => s.taskStatus)

  // Hooks
  useFormPersistence()
  useStorageInit()
  useSessionRestore(currentDir)

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // --- Push-based task status update listener ---
  useEffect(() => {
    const handleUpdate = (data: { taskId: string; status: string; result: unknown }): void => {
      const currentId = useSeedanceCreateStore.getState().createdId
      if (data.taskId !== currentId || !currentId) return

      useSeedanceCreateStore.getState().update({ taskStatus: data.status })
      updateSessionCache(data.taskId, { status: data.status })

      if (data.status === 'succeeded') {
        stoppedRef.current = true
        const result = data.result as Record<string, unknown> | undefined
        const content = result?.content as Record<string, unknown> | undefined
        const remoteUrl = String(content?.video_url || '')

        if (remoteUrl) {
          const { currentDir } = useSeedanceCreateStore.getState()

          // Save session immediately before slow download
          const sessionBase = { taskId: data.taskId, remoteUrl, dir: currentDir }
          localStorage.setItem(
            STORAGE_LAST_SESSION_KEY,
            JSON.stringify({ ...sessionBase, localPath: '', status: 'succeeded', timestamp: Date.now() })
          )

          downloadAndShowVideo(data.taskId, remoteUrl, sessionBase, currentDir)
        }
      } else if (data.status === 'failed') {
        stoppedRef.current = true
        const result = data.result as { error?: { message?: string } } | undefined
        const errObj = result?.error
        useSeedanceCreateStore.getState().update({
          pollError: errObj?.message ? String(errObj.message) : '视频生成失败'
        })
      } else if (data.status === 'cancelled' || data.status === 'expired') {
        stoppedRef.current = true
        useSeedanceCreateStore.getState().update({
          pollError: `任务已${data.status === 'cancelled' ? '取消' : '过期'}`
        })
      }
    }

    window.api.seedance.onTaskUpdate(handleUpdate)
    return () => {
      window.api.seedance.removeTaskUpdateListener()
    }
  }, [])

  /** Download a remote video and turn it into a blob URL for the preview */
  const downloadAndShowVideo = useCallback(
    async (
      taskId: string,
      remoteUrl: string,
      sessionBase?: Record<string, unknown>,
      overrideDir?: string
    ): Promise<void> => {
      try {
        const dir = overrideDir || useSeedanceCreateStore.getState().currentDir
        const localPath = await window.api.file.downloadVideo({
          url: remoteUrl,
          destDir: dir,
          filename: `Seedance_${taskId}_${Date.now()}`
        })
        const buffer = await window.api.file.readFileBuffer(localPath)
        const blob = new Blob([buffer], { type: 'video/mp4' })
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = URL.createObjectURL(blob)
        useSeedanceCreateStore.getState().update({ videoUrl: blobUrlRef.current })
        if (sessionBase) {
          localStorage.setItem(
            STORAGE_LAST_SESSION_KEY,
            JSON.stringify({ ...sessionBase, localPath, status: 'succeeded', timestamp: Date.now() })
          )
        }
      } catch {
        useSeedanceCreateStore.getState().update({ videoUrl: remoteUrl })
      }
    },
    []
  )

  const pollTask = useCallback(async (taskId: string) => {
    // Reset stopped flag
    stoppedRef.current = false

    while (!stoppedRef.current) {
      await new Promise((r) => setTimeout(r, 5000))
      if (stoppedRef.current) break
      try {
        const result = (await window.api.seedance.getTask(taskId)) as Record<string, unknown>
        const status = String(result.status || '')
        useSeedanceCreateStore.getState().update({ taskStatus: status })
        updateSessionCache(taskId, { status })

        if (status === 'succeeded') {
          stoppedRef.current = true
          const content = result.content as Record<string, unknown> | undefined
          const remoteUrl = String(content?.video_url || '')
          const { currentDir } = useSeedanceCreateStore.getState()

          // Save session data immediately (before slow download)
          const sessionBase = { taskId, remoteUrl, dir: currentDir }
          localStorage.setItem(
            STORAGE_LAST_SESSION_KEY,
            JSON.stringify({ ...sessionBase, localPath: '', status: 'succeeded', timestamp: Date.now() })
          )

          if (remoteUrl) {
            await downloadAndShowVideo(taskId, remoteUrl, sessionBase, currentDir)
          }
        } else if (status === 'failed') {
          stoppedRef.current = true
          const errObj = result.error as Record<string, unknown> | undefined
          useSeedanceCreateStore.getState().update({
            pollError: errObj?.message ? String(errObj.message) : '视频生成失败'
          })
        } else if (status === 'cancelled' || status === 'expired') {
          stoppedRef.current = true
          useSeedanceCreateStore.getState().update({
            pollError: `任务已${status === 'cancelled' ? '取消' : '过期'}`
          })
        }
      } catch {
        useSeedanceCreateStore.getState().update({ pollError: '查询任务状态失败' })
        stoppedRef.current = true
      }
    }
  }, [downloadAndShowVideo])

  const handleSubmit = async (): Promise<void> => {
    const s = useSeedanceCreateStore.getState()
    const {
      prompt,
      imageData,
      firstFramePath,
      useLastFrame,
      lastFrameData,
      lastFramePath,
      ratio,
      duration,
      resolution,
      generateAudio,
      watermark,
      currentDir
    } = s

    if (!prompt.trim()) {
      s.update({ error: '请输入视频提示词' })
      return
    }

    // Reset stopped flag for new task
    stoppedRef.current = false

    s.update({
      error: '',
      apiKeyMissing: false,
      submitting: true,
      taskStatus: '',
      videoUrl: '',
      pollError: '',
      currentTime: 0,
      isPlaying: false,
      hasInteracted: false,
      autoKeyframes: [],
      manualKeyframes: []
    })

    try {
      const content: { type: string; text?: string; image_url?: { url: string }; role?: string }[] =
        [{ type: 'text', text: prompt.trim() }]

      if (imageData && useLastFrame && lastFrameData) {
        content.push({ type: 'image_url', image_url: { url: imageData }, role: 'first_frame' })
        content.push({ type: 'image_url', image_url: { url: lastFrameData }, role: 'last_frame' })
      } else if (imageData) {
        content.push({ type: 'image_url', image_url: { url: imageData } })
      }

      const params: Record<string, unknown> = {
        model: 'doubao-seedance-1-5-pro-251215',
        content,
        ratio,
        duration,
        resolution,
        generate_audio: generateAudio,
        watermark
      }

      const result = (await window.api.seedance.createTask(params)) as { id: string }
      const id = result.id

      useSeedanceCreateStore.getState().update({ createdId: id, taskStatus: 'queued' })

      // --- Save comprehensive cache to localStorage immediately ---
      updateSessionCache(id, {
        status: 'queued',
        remoteUrl: '',
        localPath: '',
        dir: currentDir,
        storageDir: currentDir,
        prompt: prompt.trim(),
        ratio,
        duration,
        resolution,
        generateAudio,
        watermark
      })

      pollTask(id)

      try {
        const relativeFirstPath =
          firstFramePath && currentDir
            ? await window.api.path.relative(currentDir, firstFramePath)
            : null
        const relativeLastPath =
          lastFramePath && currentDir
            ? await window.api.path.relative(currentDir, lastFramePath)
            : null
        await window.api.taskParams.save({
          task_id: id,
          version: '1.5',
          prompt: prompt.trim(),
          ratio,
          duration: duration > 0 ? duration : null,
          resolution,
          generate_audio: generateAudio ? 1 : 0,
          watermark: watermark ? 1 : 0,
          model: 'doubao-seedance-1-5-pro-251215',
          first_frame_path: relativeFirstPath,
          last_frame_path: relativeLastPath,
          first_frame_data: imageData || null,
          last_frame_data: lastFrameData || null,
          full_params: JSON.stringify(params)
        })
      } catch {
        /* task params save is best-effort */
      }
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '1.5', '创建任务失败')
      useSeedanceCreateStore.getState().update({ error: message, apiKeyMissing: isMissing })
    } finally {
      useSeedanceCreateStore.getState().update({ submitting: false })
    }
  }

  const handleDeleteManualKeyframe = useCallback(async (index: number) => {
    if (!window.confirm('确定删除此关键帧？')) return
    try {
      const { currentDir, createdId, manualKeyframes } = useSeedanceCreateStore.getState()
      await window.api.file.deleteFile(`${currentDir}/Seedance_${createdId}_manual_${index}.png`)
      for (let i = index + 1; i < manualKeyframes.length; i++) {
        await window.api.file.saveKeyframe({
          base64Data: manualKeyframes[i],
          destDir: currentDir,
          filename: `Seedance_${createdId}_manual_${i - 1}`
        })
        await window.api.file.deleteFile(`${currentDir}/Seedance_${createdId}_manual_${i}.png`)
      }
      useSeedanceCreateStore.getState().removeManualKeyframe(index)
    } catch {
      /* fail silently */
    }
  }, [])

  const handleClearAllKeyframes = useCallback(async () => {
    if (!window.confirm('确定清空所有关键帧？此操作不可撤销')) return
    try {
      const { currentDir, createdId, autoKeyframes, manualKeyframes } =
        useSeedanceCreateStore.getState()
      for (let i = 0; i < autoKeyframes.length; i++) {
        await window.api.file
          .deleteFile(`${currentDir}/Seedance_${createdId}_keyframe_${i}.png`)
          .catch(() => {})
      }
      for (let i = 0; i < manualKeyframes.length; i++) {
        await window.api.file
          .deleteFile(`${currentDir}/Seedance_${createdId}_manual_${i}.png`)
          .catch(() => {})
      }
    } catch {
      /* ignore */
    }
    useSeedanceCreateStore.getState().clearKeyframes()
  }, [])

  const setImageData = useSeedanceCreateStore((s) => s.update)
  const setLastFrameData = useSeedanceCreateStore((s) => s.update)

  const renderRight = (): React.JSX.Element => {
    if (pollError && !videoUrl) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[240px]">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {pollError}
          </div>
          <button
            onClick={() => useSeedanceCreateStore.getState().resetPanel()}
            className="text-sm text-primary hover:underline"
          >
            重新开始
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        <VideoPlayer
          videoUrl={videoUrl}
          loading={!!createdId && !videoUrl}
          loadingLabel={taskStatus === 'succeeded' ? '任务已完成，正在下载视频...' : '视频生成中...'}
          taskId={createdId}
          storageDir={currentDir}
          videoRef={videoRef}
          versionPrefix="Seedance_"
          onKeyframeCapture={(dataUrl) => {
            useSeedanceCreateStore.getState().addManualKeyframe(dataUrl)
          }}
        />
        <KeyframeGrid
          onSetFirstFrame={(dataUrl) => setImageData({ imageData: dataUrl })}
          onSetLastFrame={(dataUrl) =>
            setLastFrameData({ lastFrameData: dataUrl, useLastFrame: true })
          }
          onDeleteManualKeyframe={handleDeleteManualKeyframe}
          onClearAllKeyframes={handleClearAllKeyframes}
        />
      </div>
    )
  }

  return (
    <TwoColumnLayout
      left={<CreateForm onSubmit={handleSubmit} />}
      right={<div className="flex flex-col h-full overflow-y-auto">{renderRight()}</div>}
    />
  )
}
