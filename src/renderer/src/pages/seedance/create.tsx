import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoIcon, UploadIcon, XIcon, Loader2Icon, CameraIcon, PlayIcon } from 'lucide-react'

type Ratio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive'
type Resolution = '480p' | '720p' | '1080p'

const STORAGE_DIRS_KEY = 'seedance-storage-dirs'
const STORAGE_CURRENT_KEY = 'seedance-storage-current'
const STORAGE_LAST_SESSION_KEY = 'seedance-last-session'

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
  const navigate = useNavigate()

  // Form state
  const [prompt, setPrompt] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [useLastFrame, setUseLastFrame] = useState(false)
  const [lastFrameData, setLastFrameData] = useState<string | null>(null)
  const [ratio, setRatio] = useState<Ratio>('16:9')
  const [duration, setDuration] = useState(-1)
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [watermark, setWatermark] = useState(false)
  const [error, setError] = useState('')
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
  const [isHovering, setIsHovering] = useState(false)
  const [capturingAuto, setCapturingAuto] = useState(false)

  // Keyframes state
  const [autoKeyframes, setAutoKeyframes] = useState<string[]>([])
  const [manualKeyframes, setManualKeyframes] = useState<string[]>([])

  // Init storage location
  useEffect(() => {
    // Cleanup blob URL on unmount
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

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

  // Restore last session (video + keyframes) from localStorage
  useEffect(() => {
    if (!currentDir) return
    const restoreSession = async (): Promise<void> => {
      try {
        const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
        let taskId: string | null = null
        let remoteUrl = ''

        if (raw) {
          const session = JSON.parse(raw)
          taskId = session.taskId || null
          // Support both new (remoteUrl) and old (videoUrl) session keys
          remoteUrl = session.remoteUrl || session.videoUrl || ''

          // Try to use local video file first (fast, no CORS)
          if (session.localPath) {
            try {
              const buffer = await window.api.file.readFileBuffer(session.localPath)
              const blob = new Blob([buffer], { type: 'video/mp4' })
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
              blobUrlRef.current = URL.createObjectURL(blob)
              setVideoUrl(blobUrlRef.current)
              remoteUrl = '' // Local path succeeded, skip remote fallback
            } catch {
              // Local file unavailable, fall through to remote URL
            }
          }
        }

        // No saved session or local file failed → try default task
        if (!taskId) {
          taskId = 'cgt-20260524203622-l66fm'
          try {
            const result = (await window.api.seedance.getTask(taskId)) as Record<string, unknown>
            const content = result.content as Record<string, unknown> | undefined
            remoteUrl = String(content?.video_url || '')
          } catch {
            // Default task unavailable, page stays empty
            taskId = null
          }
        }

        if (taskId) setCreatedId(taskId)
        if (remoteUrl && !blobUrlRef.current) setVideoUrl(remoteUrl)

        // Read saved keyframes from disk
        if (taskId) {
          const result = await window.api.file.readKeyframes({ dir: currentDir, taskId })
          const autoFrames = result.autoFrames.filter(Boolean) as string[]
          if (autoFrames.length > 0) setAutoKeyframes(autoFrames)
          if (result.manualFrames.length > 0) setManualKeyframes(result.manualFrames)
        }
      } catch {
        // Session data stale, ignore
      }
    }
    restoreSession()
  }, [currentDir])

  // Save storage state
  const saveStorageDir = useCallback((dir: string, dirs: string[]): void => {
    localStorage.setItem(STORAGE_DIRS_KEY, JSON.stringify(dirs))
    localStorage.setItem(STORAGE_CURRENT_KEY, dir)
  }, [])

  // Handle storage dir change
  const handleStorageChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const val = e.target.value
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

  // Image selection
  const handleSelectImage = async (): Promise<void> => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    setImageData(base64)
  }

  const handleSelectLastFrame = async (): Promise<void> => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    setLastFrameData(base64)
  }

  // Task polling
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

          // Download video to local storage, then serve from local blob URL
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

            // Save session for next visit (with local path for instant restore)
            localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify({
              taskId,
              remoteUrl,
              localPath,
              dir: currentDir
            }))
          } catch (e) {
            console.error('视频下载或本地加载失败，使用远程URL:', e)
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
      } catch (err) {
        console.error('轮询失败:', err)
        setPollError('查询任务状态失败')
        stopped = true
      }
    }
  }, [currentDir])

  // Handle submit
  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('请输入视频提示词')
      return
    }
    setError('')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败')
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
      // Wait for metadata
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

      // Pause video for seeking
      video.pause()
      const canvas = document.createElement('canvas')
      const frames: string[] = []

      for (let i = 0; i < positions.length; i++) {
        try {
          await seekVideo(video, positions[i])
          const dataUrl = captureFrameToDataUrl(video, canvas)
          if (dataUrl) {
            frames.push(dataUrl)
            // Save to disk (fire-and-forget)
            window.api.file.saveKeyframe({
              base64Data: dataUrl,
              destDir: currentDir,
              filename: `Seedance_${createdId}_keyframe_${i}`
            }).catch(() => {})
          }
        } catch {
          // Skip failed frame
        }
      }

      setAutoKeyframes(frames)
      setCapturingAuto(false)
      // Seek back to start
      video.currentTime = 0
    }

    doAutoCapture()
  }, [videoUrl, currentDir, createdId])

  // Manual keyframe capture
  const handleCaptureKeyframe = useCallback(async (): Promise<void> => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const dataUrl = captureFrameToDataUrl(video, canvas)
    if (!dataUrl) return

    const index = manualKeyframes.length
    setManualKeyframes((prev) => [...prev, dataUrl])

    // Save to disk
    try {
      await window.api.file.saveKeyframe({
        base64Data: dataUrl,
        destDir: currentDir,
        filename: `Seedance_${createdId}_manual_${index}`
      })
      // Update session manual count
      const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        session.manualCount = index + 1
        localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify(session))
      }
    } catch {
      console.error('关键帧保存失败')
    }
  }, [manualKeyframes, currentDir, createdId])

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
      video.play().catch(() => {
        setIsPlaying(false)
      })
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

  // Determine keyframe button visibility:
  // - Always show on hover
  // - Always show when user has explicitly paused the video
  // - Hide during playback unless hovering
  // - Don't show on initial load (before any play/pause interaction)
  const showKeyframeBtn = isHovering || (hasInteracted && !isPlaying && !!videoUrl)

  return (
    <div className="flex w-full h-full gap-6">
      {/* ===== Left Panel ===== */}
      <div className="p-4 w-1/2 space-y-5 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <VideoIcon className="h-6 w-6" />
            视频创作
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            使用 Doubao-Seedance-1.5-Pro 模型生成视频
          </p>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium mb-1.5">提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的视频内容，例如：写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            中文不超过 500 字，英文不超过 1000 词
          </p>
        </div>

        {/* Reference Image */}
        <div>
          <label className="block text-sm font-medium mb-1.5">参考图片（可选）</label>
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={useLastFrame}
                onChange={(e) => setUseLastFrame(e.target.checked)}
                className="rounded border-gray-300"
              />
              使用首尾帧
            </label>
          </div>
          <div className="flex gap-3">
            <div
              onClick={handleSelectImage}
              className="relative flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
            >
              {imageData ? (
                <>
                  <img
                    src={imageData}
                    alt="首帧"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setImageData(null)
                    }}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <UploadIcon className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">选择首帧图</span>
                </>
              )}
            </div>
            {useLastFrame && (
              <div
                onClick={handleSelectLastFrame}
                className="relative flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
              >
                {lastFrameData ? (
                  <img
                    src={lastFrameData}
                    alt="尾帧"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <>
                    <UploadIcon className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">选择尾帧图</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">宽高比</label>
            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value as Ratio)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="adaptive">自适应</option>
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
              <option value="3:4">3:4</option>
              <option value="9:16">9:16</option>
              <option value="21:9">21:9</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">时长</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {Array.from({ length: 9 }, (_, i) => i + 4).map((d) => (
                <option key={d} value={d}>
                  {d} 秒
                </option>
              ))}
              <option value={-1}>自动</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">分辨率</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">音频</label>
            <select
              value={generateAudio ? 'true' : 'false'}
              onChange={(e) => setGenerateAudio(e.target.value === 'true')}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="true">生成音频</option>
              <option value="false">无声</option>
            </select>
          </div>
        </div>

        {/* Watermark */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="watermark"
            checked={watermark}
            onChange={(e) => setWatermark(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="watermark" className="text-sm">
            添加水印
          </label>
        </div>

        {/* Storage Location */}
        <div>
          <label className="block text-sm font-medium mb-1.5">存储位置</label>
          <div className="flex gap-2">
            <select
              value={currentDir}
              onChange={handleStorageChange}
              className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm truncate"
            >
              {storageDirs.map((dir) => (
                <option key={dir} value={dir}>
                  {dir}
                </option>
              ))}
              <option value="__add__">+ 添加目录...</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{currentDir}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <VideoIcon className="mr-2 h-4 w-4" />
                生成视频
              </>
            )}
          </button>
          {createdId && (
            <button
              onClick={() => navigate(`/seedance/tasks/${createdId}`)}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              查看详情
            </button>
          )}
        </div>
      </div>

      {/* ===== Right Panel ===== */}
      <div className="p-4 w-1/2 flex flex-col gap-4">
        {/* Top half: Video Player */}
        <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col relative min-h-[240px]">
          {!videoUrl && !pollError && (
            /* Loading / Waiting state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              {!createdId ? (
                <>
                  <VideoIcon className="h-10 w-10" />
                  <span className="text-sm">填写左侧参数后点击&#34;生成视频&#34;</span>
                </>
              ) : (
                <>
                  <Loader2Icon className="h-8 w-8 animate-spin" />
                  <span className="text-sm">
                    {taskStatus === 'succeeded'
                      ? '任务已完成，正在下载视频...'
                      : `任务正在${taskStatus === 'queued' ? '排队' : '生成'}中...`}
                  </span>
                  <span className="text-xs font-mono">ID: {createdId}</span>
                  <span className="text-xs text-muted-foreground">
                    状态:{' '}
                    {taskStatus === 'queued'
                      ? '排队中'
                      : taskStatus === 'running'
                        ? '生成中'
                        : taskStatus}
                  </span>
                </>
              )}
            </div>
          )}

          {pollError && !videoUrl && (
            /* Error state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {pollError}
              </div>
              <button
                onClick={() => {
                  setCreatedId('')
                  setTaskStatus('')
                  setPollError('')
                }}
                className="text-sm text-primary hover:underline"
              >
                重新开始
              </button>
            </div>
          )}

          {videoUrl && (
            /* Video player */
            <div
              className="flex-1 relative bg-black flex items-center justify-center"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {/* Timecode overlay */}
              <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs font-mono text-white select-none">
                {formatTimecode(currentTime, 24)}
              </div>

              {/* Keyframe capture button */}
              {showKeyframeBtn && (
                <button
                  onClick={handleCaptureKeyframe}
                  className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-primary/90 px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary transition-colors"
                >
                  <CameraIcon className="h-3.5 w-3.5" />
                  生成关键帧
                </button>
              )}

              <video
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-full cursor-pointer"
                onClick={handlePlayPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onPause={handleVideoPause}
                onPlay={handleVideoPlay}
                controls={false}
              />

              {/* Play/Pause overlay button */}
              {!isPlaying && (
                <button
                  onClick={handlePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <div className="rounded-full bg-background/90 p-3">
                    <PlayIcon className="h-6 w-6" />
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom half: Keyframes */}
        <div className="flex-1 rounded-lg border border-border bg-card overflow-y-auto min-h-[180px] p-4">
          {capturingAuto && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground h-full">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              正在提取关键帧...
            </div>
          )}

          {!capturingAuto &&
            autoKeyframes.length === 0 &&
            manualKeyframes.length === 0 &&
            !videoUrl && (
              <div className="flex items-center justify-center text-sm text-muted-foreground h-full">
                视频生成完成后将自动显示关键帧
              </div>
            )}

          {!capturingAuto && (autoKeyframes.length > 0 || manualKeyframes.length > 0) && (
            <div className="space-y-3">
              {autoKeyframes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">自动关键帧</p>
                  <div className="grid grid-cols-3 gap-2">
                    {autoKeyframes.map((dataUrl, i) => (
                      <div key={`auto-${i}`} className="relative group">
                        <img
                          src={dataUrl}
                          alt={`关键帧 ${i}`}
                          className="w-full rounded border border-border object-cover aspect-video"
                        />
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                          {i === 0 ? '开头' : i === 5 ? '结尾' : `${Math.round((i / 5) * 100)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {manualKeyframes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">手动截图</p>
                  <div className="grid grid-cols-3 gap-2">
                    {manualKeyframes.map((dataUrl, i) => (
                      <div key={`manual-${i}`} className="relative group">
                        <img
                          src={dataUrl}
                          alt={`手动截图 ${i}`}
                          className="w-full rounded border border-border object-cover aspect-video"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
