import { useState, useRef, useEffect, useCallback } from 'react'
import { CameraIcon, Loader2Icon, VideoIcon } from 'lucide-react'

const FRAME_STEP = 1 / 24

function formatTimecode(seconds: number, fps = 24): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds - Math.floor(seconds)) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

interface VideoPlayerProps {
  videoUrl?: string
  /** Whether a task is in progress (show loading state inside container) */
  loading?: boolean
  /** Label displayed during loading state */
  loadingLabel?: string
  taskId?: string
  storageDir?: string
  videoRef?: React.RefObject<HTMLVideoElement | null>
  versionPrefix?: string
  onKeyframeCapture?: (dataUrl: string) => void
  onDownload?: () => void
}

export default function VideoPlayer({
  videoUrl: externalVideoUrl,
  loading = false,
  loadingLabel = '视频生成中...',
  taskId,
  storageDir,
  videoRef: externalVideoRef,
  versionPrefix = '',
  onKeyframeCapture,
  onDownload
}: VideoPlayerProps): React.JSX.Element {
  // Internal refs
  const containerRef = useRef<HTMLDivElement>(null)
  const internalVideoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const playerRef = useRef<{ destroy: () => void; media: HTMLVideoElement | null } | null>(null)

  // Use external ref if provided, else internal
  const videoRef = externalVideoRef || internalVideoRef

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [useNative, setUseNative] = useState(false)

  const showKeyframeBtn = isHovering || (!isPlaying && !!externalVideoUrl)

  // Reset state on URL change
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setUseNative(false)
    setDuration(0)
  }, [externalVideoUrl])

  // --- Keyboard: arrow up/down for frame stepping ---
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const video = videoRef.current
      if (!video) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        video.pause()
        setIsPlaying(false)
        video.currentTime = Math.max(0, video.currentTime - FRAME_STEP)
        setCurrentTime(video.currentTime)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        video.pause()
        setIsPlaying(false)
        video.currentTime = Math.min(video.duration || 0, video.currentTime + FRAME_STEP)
        setCurrentTime(video.currentTime)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [videoRef])

  // --- Create/destroy xgplayer instance ---
  useEffect(() => {
    if (!externalVideoUrl || useNative) return

    let destroyed = false

    const initPlayer = async (): Promise<void> => {
      try {
        const Player = (await import('xgplayer')).default
        await import('xgplayer/dist/index.min.css')

        if (destroyed || !containerRef.current) return

        const player = new Player({
          el: containerRef.current,
          url: externalVideoUrl,
          fluid: true,
          autoplay: false,
          videoInit: true,
          playsinline: true,
          whitelist: [''],
          closeVideoClick: false,
          closeVideoDblclick: true,
          enableContextmenu: false,
          lang: 'zh-cn',
          ignores: ['cssfullscreen', 'heatmap', 'definition']
        }) as { destroy: () => void; media: HTMLVideoElement | null; on: (ev: string, fn: (arg?: unknown) => void) => void }

        if (destroyed) { player.destroy(); return }

        playerRef.current = player

        // Sync the video element ref
        const media = player.media as HTMLVideoElement | null
        if (media) {
          videoRef.current = media
          if (media.duration) setDuration(media.duration)
          media.addEventListener('loadedmetadata', () => {
            if (media.duration) setDuration(media.duration)
          })
          media.addEventListener('timeupdate', () => {
            setCurrentTime(media.currentTime)
          })
          media.addEventListener('play', () => setIsPlaying(true))
          media.addEventListener('pause', () => setIsPlaying(false))

          // After seek (e.g. progress bar drag), pause to prevent auto-play
          media.addEventListener('seeked', () => {
            media.pause()
            setIsPlaying(false)
          })
        }

        player.on('play', () => setIsPlaying(true))
        player.on('pause', () => setIsPlaying(false))
      } catch {
        if (!destroyed) setUseNative(true)
      }
    }

    initPlayer()

    return () => {
      destroyed = true
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [externalVideoUrl, useNative, videoRef])

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [videoRef])

  // --- Keyframe capture ---
  const handleCaptureKeyframe = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      ctx.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      if (!dataUrl || !dataUrl.match(/^data:image\//)) return

      setCaptureFlash(true)
      setTimeout(() => setCaptureFlash(false), 300)

      // Notify parent
      if (onKeyframeCapture) {
        onKeyframeCapture(dataUrl)
      }

      // Save keyframe to disk at storageDir
      if (storageDir) {
        setCapturing(true)
        try {
          await window.api.file.saveKeyframe({
            base64Data: dataUrl,
            destDir: storageDir,
            filename: `${versionPrefix || 'Seedance_'}${taskId || ''}_manual_${Date.now()}`
          })
        } catch {
          /* save failed silently */
        } finally {
          setCapturing(false)
        }
      }
    } catch { /* capture failed */ }
  }, [videoRef, storageDir, taskId, versionPrefix, onKeyframeCapture])

  // --- Time update handlers for native fallback ---
  const handleNativeTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setCurrentTime(video.currentTime)
      if (video.duration && !duration) setDuration(video.duration)
    }
  }, [videoRef, duration])

  const handleNativeLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video && video.duration) setDuration(video.duration)
  }, [videoRef])

  const handleNativePause = useCallback(() => setIsPlaying(false), [])
  const handleNativePlay = useCallback(() => setIsPlaying(true), [])

  const captureFlashOverlay = captureFlash ? (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-500/80 text-white text-xs rounded px-3 py-1 animate-pulse pointer-events-none">
      已截图
    </div>
  ) : null

  const keyframeBtn = showKeyframeBtn ? (
    <button
      onClick={handleCaptureKeyframe}
      disabled={capturing}
      className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-primary/90 px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary transition-colors disabled:opacity-50"
    >
      {capturing ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CameraIcon className="h-3.5 w-3.5" />}
      生成关键帧
    </button>
  ) : null

  const downloadBtn = onDownload && isHovering ? (
    <button
      onClick={onDownload}
      className="absolute bottom-12 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black/80 transition-colors"
    >
      下载
    </button>
  ) : null

  // --- Loading state (task in progress, waiting for video) ---
  if (loading && !externalVideoUrl) {
    return (
      <div className="relative bg-black w-full overflow-hidden min-h-[240px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-3 text-white/70">
          <Loader2Icon className="h-8 w-8 animate-spin" />
          <span className="text-sm">{loadingLabel}</span>
        </div>
      </div>
    )
  }

  // --- Initial state (no task, no loading, no video) ---
  if (!externalVideoUrl) {
    return (
      <div className="relative bg-black w-full overflow-hidden min-h-[240px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-3 text-white/50">
          <VideoIcon className="h-10 w-10" />
          <span className="text-sm">预览区域</span>
        </div>
      </div>
    )
  }

  // --- Native fallback ---
  if (useNative) {
    return (
      <div
        className="relative bg-black w-full overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs font-mono text-white select-none pointer-events-none">
          {formatTimecode(currentTime)}
        </div>

        {captureFlashOverlay}
        {keyframeBtn}
        {downloadBtn}

        <video
          ref={videoRef as React.RefObject<HTMLVideoElement | null>}
          src={externalVideoUrl}
          className="w-full max-w-[1280px] h-auto max-h-[720px] object-contain cursor-pointer mx-auto"
          onClick={handlePlayPause}
          onTimeUpdate={handleNativeTimeUpdate}
          onLoadedMetadata={handleNativeLoadedMetadata}
          onPause={handleNativePause}
          onPlay={handleNativePlay}
          playsInline
          preload="auto"
        />

        <canvas ref={canvasRef} className="hidden" />

        {!isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 p-3 hover:bg-background/95 transition-colors shadow-lg"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </button>
        )}
      </div>
    )
  }

  // --- xgplayer render ---
  return (
    <div
      className="relative bg-black w-full overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div ref={containerRef} className="w-full [&_.xgplayer-controls]:!px-3" />

      {captureFlashOverlay}
      {keyframeBtn}
      {downloadBtn}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
