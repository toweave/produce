import { useState, type RefObject, useRef } from 'react'
import { VideoIcon, Loader2Icon, PlayIcon, CameraIcon } from 'lucide-react'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'

function formatTimecode(seconds: number, fps = 24): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds - Math.floor(seconds)) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>
}

export function VideoPlayer({ videoRef }: VideoPlayerProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = useState(false)

  const videoUrl = useSeedanceCreateStore((s) => s.videoUrl)
  const pollError = useSeedanceCreateStore((s) => s.pollError)
  const createdId = useSeedanceCreateStore((s) => s.createdId)
  const taskStatus = useSeedanceCreateStore((s) => s.taskStatus)
  const isPlaying = useSeedanceCreateStore((s) => s.isPlaying)
  const currentTime = useSeedanceCreateStore((s) => s.currentTime)
  const captureFlash = useSeedanceCreateStore((s) => s.captureFlash)

  const showKeyframeBtn = hover || (!isPlaying && !!videoUrl)

  const handlePlayPause = (): void => {
    const video = videoRef.current
    if (!video) return
    const { setIsPlaying, setHasInteracted } = useSeedanceCreateStore.getState()
    if (video.paused) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
    setHasInteracted(true)
  }

  const handleTimeUpdate = (): void => {
    const video = videoRef.current
    if (video) useSeedanceCreateStore.getState().setCurrentTime(video.currentTime)
  }

  const handlePause = (): void => {
    useSeedanceCreateStore.getState().setIsPlaying(false)
    useSeedanceCreateStore.getState().setHasInteracted(true)
  }

  const handlePlay = (): void => {
    useSeedanceCreateStore.getState().setIsPlaying(true)
  }

  const handleCaptureKeyframe = (): void => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    useSeedanceCreateStore.getState().captureKeyframe(video, canvas)
  }

  return (
    <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col relative min-h-[240px]">
      {!videoUrl && !pollError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          {!createdId ? (
            <>
              <VideoIcon className="h-10 w-10" />
              <span className="text-sm">填写左侧参数后点击"生成视频"</span>
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
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
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
      )}

      {videoUrl && (
        <div
          className="flex-1 relative bg-black flex items-center justify-center"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs font-mono text-white select-none">
            {formatTimecode(currentTime)}
          </div>

          {captureFlash && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-500/80 text-white text-xs rounded px-3 py-1 animate-pulse">
              已截图
            </div>
          )}

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
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePause}
            onPlay={handlePlay}
            controls={false}
          />

          {!isPlaying && (
            <button
              onClick={handlePlayPause}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 p-3 hover:bg-background/95 transition-colors shadow-lg"
            >
              <PlayIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
