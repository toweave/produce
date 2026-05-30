import { useState, useRef, useCallback, useEffect } from 'react'
import { CameraIcon, DownloadIcon, Loader2Icon } from 'lucide-react'

function formatTimecode(seconds: number, fps = 24) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds - Math.floor(seconds)) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
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

interface VideoPlayerProps {
  videoUrl: string
  taskId: string
  storageDir?: string
  videoRef?: React.RefObject<HTMLVideoElement | null>
  versionPrefix?: string
  onKeyframeCapture?: (dataUrl: string) => void
  onDownload?: () => void
}

export default function VideoPlayer({ videoUrl, taskId, storageDir, videoRef: externalVideoRef, versionPrefix = '', onKeyframeCapture, onDownload }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const internalVideoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const playerRef = useRef<{ destroy: () => void; media: HTMLVideoElement | null } | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [useNative, setUseNative] = useState(false)

  // Reset state on URL change
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setUseNative(false)
  }, [videoUrl])

  // Create/destroy xgplayer instance
  useEffect(() => {
    if (!videoUrl || useNative) return

    let destroyed = false

    const initPlayer = async (): Promise<void> => {
      try {
        const Player = (await import('xgplayer')).default
        await import('xgplayer/dist/index.min.css')

        if (destroyed || !containerRef.current) return

        const player = new Player({
          el: containerRef.current,
          url: videoUrl,
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
        }) as { destroy: () => void; media: HTMLVideoElement | null; on: (ev: string, fn: () => void) => void }

        if (destroyed) { player.destroy(); return }

        playerRef.current = player

        // Sync the video element ref for external access (frame stepping / capture)
        const media = player.media as HTMLVideoElement | null
        if (media) {
          videoRef.current = media
        }

        player.on('play', () => setIsPlaying(true))
        player.on('pause', () => setIsPlaying(false))
        player.on('timeupdate', () => {
          if (media) setCurrentTime(media.currentTime)
        })
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
  }, [videoUrl, useNative])

  // Keyboard frame-stepping when paused (works with both xgplayer and native)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
    }
  }, [])

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [])

  const handleCaptureKeyframe = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const dataUrl = captureFrameToDataUrl(video, canvas)
    if (!dataUrl || !dataUrl.match(/^data:image\//)) return

    setCaptureFlash(true)
    setTimeout(() => setCaptureFlash(false), 300)

    setCapturing(true)
    try {
      if (storageDir) {
        await window.api.file.saveKeyframe({
          base64Data: dataUrl,
          destDir: storageDir,
          filename: `${versionPrefix || 'Seedance_'}${taskId}_manual_${Date.now()}`
        })
      }
      if (onKeyframeCapture) {
        onKeyframeCapture(dataUrl)
      }
    } catch {
      console.error('关键帧保存失败')
    } finally {
      setCapturing(false)
    }
  }, [storageDir, taskId, onKeyframeCapture])

  const showKeyframeBtn = isHovering || (!isPlaying && !!videoUrl)

  // --- Native fallback (or no xgplayer container) ---
  if (useNative || !videoUrl) {
    return (
      <div
        className="relative bg-black w-full"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs font-mono text-white select-none pointer-events-none">
          {formatTimecode(currentTime, 24)}
        </div>

        {captureFlash && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-500/80 text-white text-xs rounded px-3 py-1 animate-pulse pointer-events-none">
            已截图
          </div>
        )}

        {showKeyframeBtn && onKeyframeCapture && (
          <button
            onClick={handleCaptureKeyframe}
            disabled={capturing}
            className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-primary/90 px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary transition-colors disabled:opacity-50"
          >
            {capturing ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CameraIcon className="h-3.5 w-3.5" />}
            关键帧
          </button>
        )}

        {onDownload && isHovering && (
          <button
            onClick={onDownload}
            className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black/80 transition-colors"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            下载
          </button>
        )}

        <video
          ref={videoRef as React.RefObject<HTMLVideoElement | null>}
          src={videoUrl}
          className="w-full max-w-full h-auto cursor-pointer"
          onClick={handlePlayPause}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          playsInline
          preload="auto"
        />

        {!isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 p-3 hover:bg-background/95 transition-colors shadow-lg"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // --- xgplayer render ---
  return (
    <div
      className="relative bg-black w-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* xgplayer container — fluid layout adapts to video aspect ratio */}
      <div ref={containerRef} className="w-full [&_.xgplayer-controls]:!px-3" />

      {/* Capture flash feedback */}
      {captureFlash && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-500/80 text-white text-xs rounded px-3 py-1 animate-pulse pointer-events-none">
          已截图
        </div>
      )}

      {/* Keyframe capture button */}
      {showKeyframeBtn && onKeyframeCapture && (
        <button
          onClick={handleCaptureKeyframe}
          disabled={capturing}
          className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-primary/90 px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary transition-colors disabled:opacity-50"
        >
          {capturing ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CameraIcon className="h-3.5 w-3.5" />}
          关键帧
        </button>
      )}

      {/* Download button */}
      {onDownload && isHovering && (
        <button
          onClick={onDownload}
          className="absolute bottom-12 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black/80 transition-colors"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          下载
        </button>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
