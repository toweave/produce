/**
 * VideoPlayer
 *
 * Refactored from 15 props to 3 props using zustand for shared state management.
 *
 * BEFORE (15 props):
 *   videoUrl, isPlaying, currentTime, onPlay, onPause, onTimeUpdate,
 *   onCaptureFrame, capturing, hasError, errorMessage, videoRef,
 *   volume, muted, playbackRate, onRateChange
 *
 * AFTER (3 props):
 *   videoUrl   — source URL (required)
 *   videoRef   — video DOM ref, shared with parent (required)
 *   callbacks  — grouped notification callbacks (optional)
 *
 * Internal state (isPlaying, currentTime, volume, muted, playbackRate,
 * capturing, hasError, errorMessage) is managed via the zustand store.
 * Callbacks (onPlay, onPause, onTimeUpdate, onRateChange, onCaptureFrame)
 * are combined into a single object prop.
 */

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react'
import {
  PlayIcon,
  PauseIcon,
  CameraIcon,
  Volume2Icon,
  VolumeXIcon,
  Loader2Icon,
  AlertCircleIcon,
} from 'lucide-react'

import { useVideoPlayerStore, selectError, type VideoPlayerCallbacks } from './video-player-store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimecode(seconds: number, fps = 24): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds - Math.floor(seconds)) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

function captureFrameToDataUrl(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): string {
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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VideoPlayerProps {
  /** Source URL of the video */
  videoUrl: string
  /** Video DOM element ref (shared with parent if needed) */
  videoRef: RefObject<HTMLVideoElement | null>
  /** Grouped notification callbacks */
  callbacks?: VideoPlayerCallbacks
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoPlayer({ videoUrl, videoRef, callbacks }: VideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = useState(false)

  // ── Register callbacks on change ──────────────────────────────────────
  const setCallbacks = useVideoPlayerStore((s) => s.setCallbacks)
  useEffect(() => {
    if (callbacks) setCallbacks(callbacks)
  }, [callbacks, setCallbacks])

  // ── Subscribe to store slices ─────────────────────────────────────────
  const isPlaying = useVideoPlayerStore((s) => s.isPlaying)
  const currentTime = useVideoPlayerStore((s) => s.currentTime)
  const volume = useVideoPlayerStore((s) => s.volume)
  const muted = useVideoPlayerStore((s) => s.muted)
  const playbackRate = useVideoPlayerStore((s) => s.playbackRate)
  const capturing = useVideoPlayerStore((s) => s.capturing)
  const { hasError, errorMessage } = useVideoPlayerStore(selectError)

  // ── Actions ───────────────────────────────────────────────────────────
  const play = useVideoPlayerStore((s) => s.play)
  const pause = useVideoPlayerStore((s) => s.pause)
  const togglePlay = useVideoPlayerStore((s) => s.togglePlay)
  const setCurrentTime = useVideoPlayerStore((s) => s.setCurrentTime)
  const setVolume = useVideoPlayerStore((s) => s.setVolume)
  const setMuted = useVideoPlayerStore((s) => s.setMuted)
  const setPlaybackRate = useVideoPlayerStore((s) => s.setPlaybackRate)
  const setCapturing = useVideoPlayerStore((s) => s.setCapturing)

  // ── Event handlers that bridge DOM events ↔ store ────────────────────

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video) setCurrentTime(video.currentTime)
  }, [videoRef, setCurrentTime])

  const handleVideoPlay = useCallback(() => {
    play()
  }, [play])

  const handleVideoPause = useCallback(() => {
    pause()
  }, [pause])

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused || video.ended) {
      video.play().catch(() => {
        /* ignore aborts */
      })
    } else {
      video.pause()
    }
    togglePlay()
  }, [videoRef, togglePlay])

  const handleCaptureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const dataUrl = captureFrameToDataUrl(video, canvas)
    if (!dataUrl) return

    setCapturing(true)

    // Notify parent via callback
    const cb = useVideoPlayerStore.getState()._callbacks.onCaptureFrame
    cb?.(dataUrl)

    // Flash feedback
    setTimeout(() => setCapturing(false), 300)
  }, [videoRef, setCapturing])

  // ── Sync store → DOM side-effects ────────────────────────────────────

  // Sync playback rate changes to the DOM element
  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = playbackRate
  }, [playbackRate, videoRef])

  // Sync volume / muted to the DOM element
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.volume = volume
      video.muted = muted
    }
  }, [volume, muted, videoRef])

  // Reset internal state when videoUrl changes
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.pause()
      video.load()
    }
  }, [videoUrl, videoRef])

  // ── Render ────────────────────────────────────────────────────────────

  const showKeyframeBtn = hover || (!isPlaying && !!videoUrl)

  return (
    <div
      className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col relative min-h-[240px]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* ── Error state ───────────────────────────────────────────── */}
      {hasError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
            <AlertCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage || '视频加载失败'}</span>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!videoUrl && !hasError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <span className="text-sm">暂无视频</span>
        </div>
      )}

      {/* ── Video player ──────────────────────────────────────────── */}
      {videoUrl && !hasError && (
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {/* Timecode overlay */}
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs font-mono text-white select-none pointer-events-none">
            {formatTimecode(currentTime)}
          </div>

          {/* Capture flash */}
          {capturing && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-500/80 text-white text-xs rounded px-3 py-1 animate-pulse pointer-events-none">
              已截图
            </div>
          )}

          {/* Keyframe capture button */}
          {showKeyframeBtn && (
            <button
              onClick={handleCaptureFrame}
              disabled={capturing}
              className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-primary/90 px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary transition-colors disabled:opacity-50"
            >
              {capturing ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CameraIcon className="h-3.5 w-3.5" />
              )}
              截图
            </button>
          )}

          {/* Volume / mute indicator */}
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
            <button
              onClick={() => {
                const video = videoRef.current
                if (video) {
                  video.muted = !video.muted
                  setMuted(!muted)
                }
              }}
              className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
              title={muted ? '取消静音' : '静音'}
            >
              {muted || volume === 0 ? (
                <VolumeXIcon className="h-3.5 w-3.5" />
              ) : (
                <Volume2Icon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Playback rate indicator */}
          {playbackRate !== 1 && (
            <div className="absolute bottom-2 right-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs font-mono text-white select-none">
              {playbackRate}x
            </div>
          )}

          <video
            ref={videoRef as React.Ref<HTMLVideoElement>}
            src={videoUrl}
            className="max-w-full max-h-full cursor-pointer"
            onClick={handlePlayPause}
            onTimeUpdate={handleTimeUpdate}
            onPause={handleVideoPause}
            onPlay={handleVideoPlay}
            controls={false}
            playsInline
            preload="auto"
          />

          {/* Play/Pause overlay button */}
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

      {/* ── Hidden canvas for frame capture ─────────────────────────── */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
