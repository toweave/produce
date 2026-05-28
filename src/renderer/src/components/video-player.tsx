import { useState, useRef, useCallback, useEffect } from 'react'
import { PlayIcon, CameraIcon, DownloadIcon, Loader2Icon } from 'lucide-react'

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
  onKeyframeCapture?: (dataUrl: string) => void
  onDownload?: () => void
}

export default function VideoPlayer({ videoUrl, taskId, storageDir, onKeyframeCapture, onDownload }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
    }
  }, [])

  // Reset playing state when videoUrl changes
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [videoUrl])

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [])

  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video) setCurrentTime(video.currentTime)
  }, [])

  const handleVideoPause = useCallback(() => setIsPlaying(false), [])
  const handleVideoPlay = useCallback(() => setIsPlaying(true), [])

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
          filename: `Seedance_${taskId}_manual_${Date.now()}`
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

  return (
    <div
      className="relative bg-black flex items-center justify-center w-full h-full min-h-[200px]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Timecode overlay */}
      <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs font-mono text-white select-none pointer-events-none">
        {formatTimecode(currentTime, 24)}
      </div>

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
          {capturing ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CameraIcon className="h-3.5 w-3.5" />
          )}
          关键帧
        </button>
      )}

      {/* Download button */}
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
        ref={videoRef}
        src={videoUrl}
        className="max-w-full max-h-full cursor-pointer"
        onClick={handlePlayPause}
        onTimeUpdate={handleVideoTimeUpdate}
        onPause={handleVideoPause}
        onPlay={handleVideoPlay}
        playsInline
        preload="auto"
      />

      {/* Play/Pause button — centered */}
      {!isPlaying && (
        <button
          onClick={handlePlayPause}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 p-3 hover:bg-background/95 transition-colors shadow-lg"
        >
          <PlayIcon className="h-6 w-6" />
        </button>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
