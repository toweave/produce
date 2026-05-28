import { useState, useEffect, useRef, useCallback } from 'react'
import { handleApiError } from '@/lib/api-errors'
import { TwoColumnLayout } from '@/components/two-column-layout'
import { CreateForm } from './components/create-form'
import { KeyframeGrid } from './components/keyframe-grid'
import { VideoPlayer } from '../components/video-player'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'

const STORAGE_DIRS_KEY = 'seedance-storage-dirs'
const STORAGE_CURRENT_KEY = 'seedance-storage-current'
const STORAGE_LAST_SESSION_KEY = 'seedance-last-session'
const FORM_PARAMS_KEY = 'seedance-form-params'

function formatTimecode(seconds: number, fps = 24): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds - Math.floor(seconds)) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.05) {
      resolve()
      return
    }
    const handler = (): void => {
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
    video.currentTime = time
  })
}

function captureFrameToDataUrl(video: HTMLVideoElement, canvas: HTMLCanvasElement): string {
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  try {
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

export default function SeedanceCreatePage(): React.JSX.Element {
  // Task state
  const [taskStatus, setTaskStatus] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [pollError, setPollError] = useState('')

  // Player state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const justCreated = useRef(false)
  const blobUrlRef = useRef<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [capturingAuto, setCapturingAuto] = useState(false)

  // Keyframes state
  const [autoKeyframes, setAutoKeyframes] = useState<string[]>([])
  const [manualKeyframes, setManualKeyframes] = useState<string[]>([])
  const [captureFlash, setCaptureFlash] = useState(false)

  // Store selectors
  const currentDir = useSeedanceCreateStore((s) => s.currentDir)
  const setImageData = useSeedanceCreateStore((s) => s.setImageData)
  const setLastFrameData = useSeedanceCreateStore((s) => s.setLastFrameData)
  const setUseLastFrame = useSeedanceCreateStore((s) => s.setUseLastFrame)

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // Restore form parameters from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_PARAMS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        const s = useSeedanceCreateStore.getState()
        if (saved.prompt) s.setPrompt(saved.prompt)
        if (saved.ratio) s.setRatio(saved.ratio)
        if (saved.duration !== undefined) s.setDuration(saved.duration)
        if (saved.resolution) s.setResolution(saved.resolution)
        if (saved.generateAudio !== undefined) s.setGenerateAudio(saved.generateAudio)
        if (saved.watermark !== undefined) s.setWatermark(saved.watermark)
        if (saved.imageData) s.setImageData(saved.imageData)
        if (saved.lastFrameData) s.setLastFrameData(saved.lastFrameData)
        if (saved.useLastFrame !== undefined) s.setUseLastFrame(saved.useLastFrame)
        if (saved.firstFramePath) s.setFirstFramePath(saved.firstFramePath)
        if (saved.lastFramePath) s.setLastFramePath(saved.lastFramePath)
      }
    } catch {
      // Ignore corrupted data
    }
  }, [])

  // Save form parameters on change (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const formFields = [
      'prompt', 'ratio', 'duration', 'resolution',
      'generateAudio', 'watermark', 'useLastFrame',
      'firstFramePath', 'lastFramePath', 'imageData', 'lastFrameData'
    ] as const

    const unsub = useSeedanceCreateStore.subscribe((state, prev) => {
      const changed = formFields.some(
        (k) =>
          (state as unknown as Record<string, unknown>)[k] !==
          (prev as unknown as Record<string, unknown>)[k]
      )
      if (!changed) return

      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          const data: Record<string, unknown> = {
            prompt: state.prompt,
            ratio: state.ratio,
            duration: state.duration,
            resolution: state.resolution,
            generateAudio: state.generateAudio,
            watermark: state.watermark,
            useLastFrame: state.useLastFrame,
            firstFramePath: state.firstFramePath,
            lastFramePath: state.lastFramePath
          }
          if (state.imageData && state.imageData.length < 2 * 1024 * 1024) {
            data.imageData = state.imageData
          }
          if (state.lastFrameData && state.lastFrameData.length < 2 * 1024 * 1024) {
            data.lastFrameData = state.lastFrameData
          }
          localStorage.setItem(FORM_PARAMS_KEY, JSON.stringify(data))
        } catch {
          // localStorage full, ignore
        }
      }, 500)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Init storage location
  useEffect(() => {
    const initStorage = async (): Promise<void> => {
      try {
        const saved = localStorage.getItem(STORAGE_DIRS_KEY)
        const savedCurrent = localStorage.getItem(STORAGE_CURRENT_KEY)
        if (saved && savedCurrent) {
          const dirs = JSON.parse(saved) as string[]
          useSeedanceCreateStore.getState().setStorageDirs(dirs)
          useSeedanceCreateStore.getState().setCurrentDir(savedCurrent)
        } else {
          const defaultPath = await window.api.file.getDefaultPath()
          useSeedanceCreateStore.getState().setStorageDirs([defaultPath])
          useSeedanceCreateStore.getState().setCurrentDir(defaultPath)
          localStorage.setItem(STORAGE_DIRS_KEY, JSON.stringify([defaultPath]))
          localStorage.setItem(STORAGE_CURRENT_KEY, defaultPath)
        }
      } catch { /* ignore */ }
    }
    initStorage()
  }, [])

  // Restore last session
  useEffect(() => {
    if (!currentDir) return
    const restoreSession = async (): Promise<void> => {
      try {
        let taskId: string | null = null
        let remoteUrl = ''
        let apiFailed = false

        try {
          const listResult = await window.api.seedance.listTasks(
            '?page_num=1&page_size=1&filter.status=succeeded'
          ) as { items?: { id: string }[] }
          const latestTask = listResult?.items?.[0]
          if (latestTask?.id) {
            taskId = latestTask.id
            const result = (await window.api.seedance.getTask(taskId)) as Record<string, unknown>
            const content = result.content as Record<string, unknown> | undefined
            remoteUrl = String(content?.video_url || '')
          }
        } catch {
          apiFailed = true
        }

        if (apiFailed || !taskId) {
          const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
          if (raw) {
            const session = JSON.parse(raw)
            taskId = session.taskId || null
            remoteUrl = session.remoteUrl || session.videoUrl || ''
            if (session.localPath && taskId) {
              try {
                const buffer = await window.api.file.readFileBuffer(session.localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                setVideoUrl(blobUrlRef.current)
                remoteUrl = ''
              } catch { /* file unavailable */ }
            }
          }
        }

        if (!taskId) return
        useSeedanceCreateStore.getState().setCreatedId(taskId)

        if (remoteUrl && !blobUrlRef.current) {
          let foundLocal = false
          try {
            const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
            if (raw) {
              const session = JSON.parse(raw)
              if (session.taskId === taskId && session.localPath) {
                const buffer = await window.api.file.readFileBuffer(session.localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                setVideoUrl(blobUrlRef.current)
                foundLocal = true
              }
            }
          } catch { /* ignore */ }

          if (!foundLocal) {
            try {
              const localPath = await window.api.file.downloadVideo({
                url: remoteUrl,
                destDir: currentDir,
                filename: `Seedance_${taskId}_restore_${Date.now()}`
              })
              const buffer = await window.api.file.readFileBuffer(localPath)
              const blob = new Blob([buffer], { type: 'video/mp4' })
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
              blobUrlRef.current = URL.createObjectURL(blob)
              setVideoUrl(blobUrlRef.current)
              localStorage.setItem(
                STORAGE_LAST_SESSION_KEY,
                JSON.stringify({ taskId, remoteUrl, localPath, dir: currentDir })
              )
            } catch {
              setVideoUrl(remoteUrl)
            }
          }
        }

        const result = await window.api.file.readKeyframes({ dir: currentDir, taskId })
        const autoFrames = result.autoFrames.filter(Boolean) as string[]
        if (autoFrames.length > 0) setAutoKeyframes(autoFrames)
        if (result.manualFrames.length > 0) setManualKeyframes(result.manualFrames)
      } catch { /* ignore */ }
    }
    restoreSession()
  }, [currentDir])

  const pollTask = useCallback(async (taskId: string): Promise<void> => {
    let stopped = false
    while (!stopped) {
      await new Promise((r) => setTimeout(r, 5000))
      if (stopped) break
      try {
        const result = (await window.api.seedance.getTask(taskId)) as Record<string, unknown>
        const status = String(result.status || '')
        setTaskStatus(status)

        if (status === 'succeeded') {
          stopped = true
          justCreated.current = true
          const content = result.content as Record<string, unknown> | undefined
          const remoteUrl = String(content?.video_url || '')

          const { currentDir } = useSeedanceCreateStore.getState()
          try {
            const timestamp = Date.now()
            const filename = `Seedance_${taskId}_${timestamp}`
            const localPath = await window.api.file.downloadVideo({
              url: remoteUrl,
              destDir: currentDir,
              filename
            })
            const buffer = await window.api.file.readFileBuffer(localPath)
            const blob = new Blob([buffer], { type: 'video/mp4' })
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = URL.createObjectURL(blob)
            setVideoUrl(blobUrlRef.current)

            localStorage.setItem(
              STORAGE_LAST_SESSION_KEY,
              JSON.stringify({ taskId, remoteUrl, localPath, dir: currentDir })
            )
          } catch {
            setVideoUrl(remoteUrl)
          }
        } else if (status === 'failed') {
          stopped = true
          const errObj = result.error as Record<string, unknown> | undefined
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
  }, [])

  const handleSubmit = async (): Promise<void> => {
    const s = useSeedanceCreateStore.getState()
    const {
      prompt, imageData, firstFramePath, useLastFrame,
      lastFrameData, lastFramePath, ratio, duration,
      resolution, generateAudio, watermark, currentDir
    } = s

    if (!prompt.trim()) {
      s.setError('请输入视频提示词')
      return
    }
    s.setError('')
    s.setApiKeyMissing(false)
    s.setSubmitting(true)
    setTaskStatus('')
    setVideoUrl('')
    setPollError('')
    setAutoKeyframes([])
    setManualKeyframes([])
    setCurrentTime(0)
    setIsPlaying(false)
    setHasInteracted(false)

    try {
      const content: { type: string; text?: string; image_url?: { url: string }; role?: string }[] = [
        { type: 'text', text: prompt.trim() }
      ]

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

      const result = await window.api.seedance.createTask(params) as { id: string }
      useSeedanceCreateStore.getState().setCreatedId(result.id)
      setTaskStatus('queued')
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
        console.error('Failed to save task params')
      }
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '1.5', '创建任务失败')
      useSeedanceCreateStore.getState().setError(message)
      useSeedanceCreateStore.getState().setApiKeyMissing(isMissing)
    } finally {
      useSeedanceCreateStore.getState().setSubmitting(false)
    }
  }

  // Auto-capture keyframes when video loads
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return
    if (!justCreated.current) return
    justCreated.current = false
    const video = videoRef.current

    const doAutoCapture = async (): Promise<void> => {
      setCapturingAuto(true)
      if (!video.duration || video.duration === 0) {
        await new Promise<void>((resolve) => {
          const handler = (): void => {
            video.removeEventListener('loadedmetadata', handler)
            resolve()
          }
          video.addEventListener('loadedmetadata', handler)
        })
      }

      const dur = video.duration
      const fps = 24
      const positions = [
        0,
        Math.floor((dur / 5) * 1000) / 1000,
        Math.floor((2 * dur / 5) * 1000) / 1000,
        Math.floor((3 * dur / 5) * 1000) / 1000,
        Math.floor((4 * dur / 5) * 1000) / 1000,
        Math.max(0, dur - 1 / fps)
      ]

      video.pause()
      const canvas = document.createElement('canvas')
      const frames: string[] = []

      const { currentDir, createdId } = useSeedanceCreateStore.getState()
      for (let i = 0; i < positions.length; i++) {
        try {
          await seekVideo(video, positions[i])
          const dataUrl = captureFrameToDataUrl(video, canvas)
          if (dataUrl) {
            frames.push(dataUrl)
            window.api.file
              .saveKeyframe({
                base64Data: dataUrl,
                destDir: currentDir,
                filename: `Seedance_${createdId}_keyframe_${i}`
              })
              .catch((e) => console.error('自动关键帧保存失败:', e))
          }
        } catch { /* skip failed frame */ }
      }

      setAutoKeyframes(frames)
      setCapturingAuto(false)
      video.currentTime = 0
    }

    doAutoCapture()
  }, [videoUrl])

  const handleCaptureKeyframe = useCallback(async (): Promise<void> => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const dataUrl = captureFrameToDataUrl(video, canvas)
    if (!dataUrl || !dataUrl.match(/^data:image\//)) return

    const index = manualKeyframes.length
    setManualKeyframes((prev) => [...prev, dataUrl])
    setCaptureFlash(true)
    setTimeout(() => setCaptureFlash(false), 300)

    try {
      const { currentDir, createdId } = useSeedanceCreateStore.getState()
      await window.api.file.saveKeyframe({
        base64Data: dataUrl,
        destDir: currentDir,
        filename: `Seedance_${createdId}_manual_${index}`
      })
      const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        session.manualCount = index + 1
        localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify(session))
      }
    } catch {
      console.error('关键帧保存失败')
    }
  }, [manualKeyframes])

  const handleDeleteManualKeyframe = useCallback(
    async (index: number): Promise<void> => {
      if (!window.confirm('确定删除此关键帧？')) return
      try {
        const { currentDir, createdId } = useSeedanceCreateStore.getState()
        await window.api.file.deleteFile(
          `${currentDir}/Seedance_${createdId}_manual_${index}.png`
        )
        for (let i = index + 1; i < manualKeyframes.length; i++) {
          const oldFilename = `Seedance_${createdId}_manual_${i}`
          const newFilename = `Seedance_${createdId}_manual_${i - 1}`
          await window.api.file.saveKeyframe({
            base64Data: manualKeyframes[i],
            destDir: currentDir,
            filename: newFilename
          })
          await window.api.file.deleteFile(`${currentDir}/${oldFilename}.png`)
        }
        setManualKeyframes((prev) => prev.filter((_, i) => i !== index))
      } catch {
        console.error('删除关键帧失败:')
      }
    },
    [manualKeyframes]
  )

  const handleClearAllKeyframes = useCallback(async (): Promise<void> => {
    if (!window.confirm('确定清空所有关键帧？此操作不可撤销')) return
    try {
      const { currentDir, createdId } = useSeedanceCreateStore.getState()
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
    } catch { /* ignore */ }
    setAutoKeyframes([])
    setManualKeyframes([])
  }, [autoKeyframes, manualKeyframes])

  // Keyboard controls (frame stepping when paused)
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const video = videoRef.current
      if (!video || video.paused === false) return
      const fps = 24
      const step = 1 / fps
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        video.currentTime = Math.min(video.duration || 0, video.currentTime + step)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        video.currentTime = Math.max(0, video.currentTime - step)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Player controls
  const handlePlayPause = (): void => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
    if (!hasInteracted) setHasInteracted(true)
  }

  const handleVideoTimeUpdate = (): void => {
    const video = videoRef.current
    if (video) setCurrentTime(video.currentTime)
  }

  const handleVideoPause = (): void => {
    setIsPlaying(false)
    if (!hasInteracted) setHasInteracted(true)
  }

  const handleVideoPlay = (): void => setIsPlaying(true)

  return (
    <TwoColumnLayout
      left={<CreateForm onSubmit={handleSubmit} />}
      right={
        <div className="flex flex-col gap-4">
          <VideoPlayer
            videoUrl={videoUrl}
            pollError={pollError}
            createdId={useSeedanceCreateStore.getState().createdId}
            taskStatus={taskStatus}
            isPlaying={isPlaying}
            currentTime={currentTime}
            captureFlash={captureFlash}
            videoRef={videoRef}
            onPlayPause={handlePlayPause}
            onCaptureKeyframe={handleCaptureKeyframe}
            onReset={() => {
              useSeedanceCreateStore.getState().setCreatedId('')
              setTaskStatus('')
              setPollError('')
            }}
            onTimeUpdate={handleVideoTimeUpdate}
            onPause={handleVideoPause}
            onPlay={handleVideoPlay}
            formatTimecode={formatTimecode}
          />
          <canvas ref={canvasRef} className="hidden" />
          <KeyframeGrid
            capturingAuto={capturingAuto}
            autoKeyframes={autoKeyframes}
            manualKeyframes={manualKeyframes}
            hasVideo={!!videoUrl}
            onSetFirstFrame={(dataUrl) => setImageData(dataUrl)}
            onSetLastFrame={(dataUrl) => {
              setLastFrameData(dataUrl)
              setUseLastFrame(true)
            }}
            onDeleteManualKeyframe={handleDeleteManualKeyframe}
            onClearAllKeyframes={handleClearAllKeyframes}
          />
        </div>
      }
    />
  )
}
