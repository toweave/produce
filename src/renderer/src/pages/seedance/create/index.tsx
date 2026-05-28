import { useState, useEffect, useRef, useCallback } from 'react'
import { handleApiError } from '@/lib/api-errors'
import { TwoColumnLayout } from '@/components/two-column-layout'
import { CreateForm } from './components/create-form'
import { KeyframeGrid } from './components/keyframe-grid'
import { VideoPlayer } from '../components/video-player'
import type { Ratio, Resolution } from '../types'

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
  // const navigate = useNavigate()

  // Form state
  const [prompt, setPrompt] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [firstFramePath, setFirstFramePath] = useState('')
  const [useLastFrame, setUseLastFrame] = useState(true)
  const [lastFrameData, setLastFrameData] = useState<string | null>(null)
  const [lastFramePath, setLastFramePath] = useState('')
  const [ratio, setRatio] = useState<Ratio>('16:9')
  const [duration, setDuration] = useState(-1)
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [watermark, setWatermark] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Storage state
  const [storageDirs, setStorageDirs] = useState<string[]>([])
  const [currentDir, setCurrentDir] = useState('')

  // Task state
  const [createdId, setCreatedId] = useState('')
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
        if (saved.prompt) {
          setPrompt(saved.prompt)
        }
        if (saved.ratio) setRatio(saved.ratio as Ratio)
        if (saved.duration !== undefined) setDuration(saved.duration)
        if (saved.resolution) setResolution(saved.resolution as Resolution)
        if (saved.generateAudio !== undefined) setGenerateAudio(saved.generateAudio)
        if (saved.watermark !== undefined) setWatermark(saved.watermark)
        if (saved.imageData) setImageData(saved.imageData)
        if (saved.lastFrameData) setLastFrameData(saved.lastFrameData)
        if (saved.useLastFrame !== undefined) setUseLastFrame(saved.useLastFrame)
        if (saved.firstFramePath) setFirstFramePath(saved.firstFramePath)
        if (saved.lastFramePath) setLastFramePath(saved.lastFramePath)
      }
    } catch {
      // Ignore corrupted data
    }
  }, [])

  // Save form parameters on change (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        const data = { prompt, ratio, duration, resolution, generateAudio, watermark, useLastFrame, firstFramePath, lastFramePath }
        if (imageData && imageData.length < 2 * 1024 * 1024) (data as Record<string, unknown>).imageData = imageData
        if (lastFrameData && lastFrameData.length < 2 * 1024 * 1024) (data as Record<string, unknown>).lastFrameData = lastFrameData
        localStorage.setItem(FORM_PARAMS_KEY, JSON.stringify(data))
      } catch {
        // localStorage full, ignore
      }
    }, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [prompt, ratio, duration, resolution, generateAudio, watermark, imageData, lastFrameData, useLastFrame, firstFramePath, lastFramePath])

  // Init storage location
  useEffect(() => {
    const initStorage = async (): Promise<void> => {
      try {
        const saved = localStorage.getItem(STORAGE_DIRS_KEY)
        const savedCurrent = localStorage.getItem(STORAGE_CURRENT_KEY)
        if (saved && savedCurrent) {
          const dirs = JSON.parse(saved) as string[]
          setStorageDirs(dirs)
          setCurrentDir(savedCurrent)
        } else {
          const defaultPath = await window.api.file.getDefaultPath()
          setStorageDirs([defaultPath])
          setCurrentDir(defaultPath)
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
          const listResult = await window.api.seedance.listTasks('?page_num=1&page_size=1&filter.status=succeeded') as { items?: { id: string }[] }
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
        setCreatedId(taskId)

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
              localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify({
                taskId, remoteUrl, localPath, dir: currentDir
              }))
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

  const saveStorageDir = useCallback((dir: string, dirs: string[]): void => {
    localStorage.setItem(STORAGE_DIRS_KEY, JSON.stringify(dirs))
    localStorage.setItem(STORAGE_CURRENT_KEY, dir)
  }, [])

  const handleStorageChange = async (val: string): Promise<void> => {
    if (val === '__add__') {
      const dir = await window.api.dialog.selectDirectory()
      if (dir) {
        if (!storageDirs.includes(dir)) {
          const newDirs = [...storageDirs, dir]
          setStorageDirs(newDirs)
          setCurrentDir(dir)
          saveStorageDir(dir, newDirs)
        } else {
          setCurrentDir(dir)
          saveStorageDir(dir, storageDirs)
        }
      }
    } else {
      setCurrentDir(val)
      saveStorageDir(val, storageDirs)
    }
  }

  const handleSelectImage = async (): Promise<void> => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    setImageData(base64)
    setFirstFramePath(filePath)
  }

  const handleSelectLastFrame = async (): Promise<void> => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    setLastFrameData(base64)
    setLastFramePath(filePath)
  }

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

          try {
            const timestamp = Date.now()
            const filename = `Seedance_${taskId}_${timestamp}`
            const localPath = await window.api.file.downloadVideo({
              url: remoteUrl, destDir: currentDir, filename
            })
            const buffer = await window.api.file.readFileBuffer(localPath)
            const blob = new Blob([buffer], { type: 'video/mp4' })
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = URL.createObjectURL(blob)
            setVideoUrl(blobUrlRef.current)

            localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify({
              taskId, remoteUrl, localPath, dir: currentDir
            }))
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
  }, [currentDir])

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('请输入视频提示词')
      return
    }
    setError('')
    setApiKeyMissing(false)
    setSubmitting(true)
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
      setCreatedId(result.id)
      setTaskStatus('queued')
      pollTask(result.id)

      try {
        const relativeFirstPath = firstFramePath && currentDir
          ? await window.api.path.relative(currentDir, firstFramePath)
          : null
        const relativeLastPath = lastFramePath && currentDir
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
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setSubmitting(false)
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
        Math.max(0, dur - (1 / fps))
      ]

      video.pause()
      const canvas = document.createElement('canvas')
      const frames: string[] = []

      for (let i = 0; i < positions.length; i++) {
        try {
          await seekVideo(video, positions[i])
          const dataUrl = captureFrameToDataUrl(video, canvas)
          if (dataUrl) {
            frames.push(dataUrl)
            window.api.file.saveKeyframe({
              base64Data: dataUrl,
              destDir: currentDir,
              filename: `Seedance_${createdId}_keyframe_${i}`
            }).catch((e) => console.error('自动关键帧保存失败:', e))
          }
        } catch { /* skip failed frame */ }
      }

      setAutoKeyframes(frames)
      setCapturingAuto(false)
      video.currentTime = 0
    }

    doAutoCapture()
  }, [videoUrl, currentDir, createdId])

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
    } catch { console.error('关键帧保存失败') }
  }, [manualKeyframes, currentDir, createdId])

  const handleDeleteManualKeyframe = useCallback(async (index: number): Promise<void> => {
    if (!window.confirm('确定删除此关键帧？')) return
    try {
      await window.api.file.deleteFile(`${currentDir}/Seedance_${createdId}_manual_${index}.png`)
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
    } catch { console.error('删除关键帧失败:') }
  }, [manualKeyframes, currentDir, createdId])

  const handleClearAllKeyframes = useCallback(async (): Promise<void> => {
    if (!window.confirm('确定清空所有关键帧？此操作不可撤销')) return
    try {
      for (let i = 0; i < autoKeyframes.length; i++) {
        await window.api.file.deleteFile(`${currentDir}/Seedance_${createdId}_keyframe_${i}.png`).catch(() => {})
      }
      for (let i = 0; i < manualKeyframes.length; i++) {
        await window.api.file.deleteFile(`${currentDir}/Seedance_${createdId}_manual_${i}.png`).catch(() => {})
      }
    } catch { /* ignore */ }
    setAutoKeyframes([])
    setManualKeyframes([])
  }, [autoKeyframes, manualKeyframes, currentDir, createdId])

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
      left={
        <CreateForm
          prompt={prompt}
          imageData={imageData}
          lastFrameData={lastFrameData}
          useLastFrame={useLastFrame}
          ratio={ratio}
          duration={duration}
          resolution={resolution}
          generateAudio={generateAudio}
          watermark={watermark}
          error={error}
          apiKeyMissing={apiKeyMissing}
          submitting={submitting}
          createdId={createdId}
          storageDirs={storageDirs}
          currentDir={currentDir}
          onPromptChange={setPrompt}
          onSelectImage={handleSelectImage}
          onClearImage={() => { setImageData(null); setFirstFramePath('') }}
          onSelectLastFrame={handleSelectLastFrame}
          onUseLastFrameChange={setUseLastFrame}
          onRatioChange={setRatio}
          onDurationChange={setDuration}
          onResolutionChange={setResolution}
          onGenerateAudioChange={setGenerateAudio}
          onWatermarkChange={setWatermark}
          onStorageChange={handleStorageChange}
          onSubmit={handleSubmit}
        />
      }
      right={
        <div className="flex flex-col gap-4">
          <VideoPlayer
            videoUrl={videoUrl}
            pollError={pollError}
            createdId={createdId}
            taskStatus={taskStatus}
            isPlaying={isPlaying}
            currentTime={currentTime}
            captureFlash={captureFlash}
            videoRef={videoRef}
            onPlayPause={handlePlayPause}
            onCaptureKeyframe={handleCaptureKeyframe}
            onReset={() => { setCreatedId(''); setTaskStatus(''); setPollError('') }}
            onTimeUpdate={handleVideoTimeUpdate}
            onPause={handleVideoPause}
            onPlay={handleVideoPlay}
            formatTimecode={formatTimecode}
          />
          <KeyframeGrid
            capturingAuto={capturingAuto}
            autoKeyframes={autoKeyframes}
            manualKeyframes={manualKeyframes}
            hasVideo={!!videoUrl}
            onSetFirstFrame={(dataUrl) => setImageData(dataUrl)}
            onSetLastFrame={(dataUrl) => { setLastFrameData(dataUrl); setUseLastFrame(true) }}
            onDeleteManualKeyframe={handleDeleteManualKeyframe}
            onClearAllKeyframes={handleClearAllKeyframes}
          />
        </div>
      }
    />
  )
}
