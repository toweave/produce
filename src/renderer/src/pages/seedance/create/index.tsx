import React, { useEffect, useRef, useCallback } from 'react'
import { handleApiError } from '@/lib/api-errors'
import { TwoColumnLayout } from '@/components/two-column-layout'
import { CreateForm } from './components/create-form'
import { KeyframeGrid } from './components/keyframe-grid'
import { VideoPlayer } from '../components/video-player'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'
import { useFormPersistence, useStorageInit } from './hooks/use-form-persistence'
import { useSessionRestore } from './hooks/use-session-restore'

const STORAGE_LAST_SESSION_KEY = 'seedance-last-session'

export default function SeedanceCreatePage(): React.JSX.Element {
  // DOM refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Store selectors
  const currentDir = useSeedanceCreateStore((s) => s.currentDir)

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

  const pollTask = useCallback(async (taskId: string) => {
    let stopped = false
    while (!stopped) {
      await new Promise((r) => setTimeout(r, 5000))
      if (stopped) break
      try {
        const result = (await window.api.seedance.getTask(taskId)) as Record<string, unknown>
        const status = String(result.status || '')
        useSeedanceCreateStore.getState().update({ taskStatus: status })

        if (status === 'succeeded') {
          stopped = true
          const content = result.content as Record<string, unknown> | undefined
          const remoteUrl = String(content?.video_url || '')
          const { currentDir } = useSeedanceCreateStore.getState()

          try {
            const localPath = await window.api.file.downloadVideo({
              url: remoteUrl,
              destDir: currentDir,
              filename: `Seedance_${taskId}_${Date.now()}`
            })
            const buffer = await window.api.file.readFileBuffer(localPath)
            const blob = new Blob([buffer], { type: 'video/mp4' })
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = URL.createObjectURL(blob)
            useSeedanceCreateStore.getState().update({ videoUrl: blobUrlRef.current })
            localStorage.setItem(
              STORAGE_LAST_SESSION_KEY,
              JSON.stringify({ taskId, remoteUrl, localPath, dir: currentDir })
            )
          } catch {
            useSeedanceCreateStore.getState().update({ videoUrl: remoteUrl })
          }
        } else if (status === 'failed') {
          stopped = true
          const errObj = result.error as Record<string, unknown> | undefined
          useSeedanceCreateStore.getState().update({
            pollError: errObj?.message ? String(errObj.message) : '视频生成失败'
          })
        } else if (status === 'cancelled' || status === 'expired') {
          stopped = true
          useSeedanceCreateStore.getState().update({
            pollError: `任务已${status === 'cancelled' ? '取消' : '过期'}`
          })
        }
      } catch {
        useSeedanceCreateStore.getState().update({ pollError: '查询任务状态失败' })
        stopped = true
      }
    }
  }, [])

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
      useSeedanceCreateStore.getState().update({ createdId: result.id, taskStatus: 'queued' })
      pollTask(result.id)

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
          task_id: result.id,
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

  // Keyboard frame-stepping when paused
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const video = videoRef.current
      if (!video || !video.paused) return
      const step = 1 / 24
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        video.currentTime = Math.min(video.duration || 0, video.currentTime + step)
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        video.currentTime = Math.max(0, video.currentTime - step)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const setImageData = useSeedanceCreateStore((s) => s.update)
  const setLastFrameData = useSeedanceCreateStore((s) => s.update)

  return (
    <TwoColumnLayout
      left={<CreateForm onSubmit={handleSubmit} />}
      right={
        <div className="flex flex-col gap-4">
          <VideoPlayer videoRef={videoRef} />
          <KeyframeGrid
            onSetFirstFrame={(dataUrl) => setImageData({ imageData: dataUrl })}
            onSetLastFrame={(dataUrl) =>
              setLastFrameData({ lastFrameData: dataUrl, useLastFrame: true })
            }
            onDeleteManualKeyframe={handleDeleteManualKeyframe}
            onClearAllKeyframes={handleClearAllKeyframes}
          />
        </div>
      }
    />
  )
}
