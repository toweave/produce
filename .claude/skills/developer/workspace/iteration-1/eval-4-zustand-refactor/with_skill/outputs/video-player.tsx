import React, { useCallback, useEffect, useState } from 'react'
import { PlayIcon, CameraIcon, DownloadIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVideoPlayerStore } from '@/stores/video-player-store'

/**
 * ────────────────────────────────────────────────────────────
 * VideoPlayer  –  refactored with zustand shared-state store
 *
 * BEFORE (15 flat props):
 *   videoUrl, isPlaying, currentTime, onPlay, onPause,
 *   onTimeUpdate, onCaptureFrame, capturing, hasError,
 *   errorMessage, videoRef, volume, muted, playbackRate,
 *   onRateChange
 *
 * AFTER (4 grouped props) — well below the 10-prop ceiling:
 *   1. videoUrl
 *   2. controls          (groups volume, muted, playbackRate)
 *   3. callbacks         (groups onPlay, onPause, onTimeUpdate,
 *                         onRateChange, onCaptureFrame)
 *   4. videoRef
 * ────────────────────────────────────────────────────────────
 */

// --------------- types ---------------

export interface VideoControls {
  volume?: number
  muted?: boolean
  playbackRate?: number
}

export interface VideoCallbacks {
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (time: number) => void
  onRateChange?: (rate: number) => void
  onCaptureFrame?: (dataUrl: string) => void
}

export interface VideoPlayerProps {
  /** The video source URL. */
  videoUrl: string
  /**
   * Grouped playback controls.  When provided these act as initial
   * values that are synchronised into the zustand store on mount
   * and on subsequent changes.
   */
  controls?: VideoControls
  /** Grouped event callbacks. */
  callbacks?: VideoCallbacks
  /**
   * DOM ref for the underlying <video> element.
   * Kept as a prop (not in the store) because useRef values are
   * not serialisable and do not belong in zustand.
   */
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

// --------------- helpers ---------------

function formatTimecode(seconds: number, fps = 24): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds - Math.floor(seconds)) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

// --------------- component ---------------

export function VideoPlayer({
  videoUrl,
  controls,
  callbacks,
  videoRef: externalVideoRef
}: VideoPlayerProps) {
  // ── local (non-shared) state ──
  const [isHovering, setIsHovering] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const internalVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // Use the external ref if provided, otherwise fall back to the internal one.
  const videoRef = externalVideoRef ?? internalVideoRef

  // ── zustand store selectors (granular – component only re-renders
  //    when the selected field changes) ──
  const isPlaying = useVideoPlayerStore((s) => s.isPlaying)
  const currentTime = useVideoPlayerStore((s) => s.currentTime)
  const capturing = useVideoPlayerStore((s) => s.capturing)
  const hasError = useVideoPlayerStore((s) => s.hasError)
  const errorMessage = useVideoPlayerStore((s) => s.errorMessage)

  const setIsPlaying = useVideoPlayerStore((s) => s.setIsPlaying)
  const setCurrentTime = useVideoPlayerStore((s) => s.setCurrentTime)
  const setVolume = useVideoPlayerStore((s) => s.setVolume)
  const setMuted = useVideoPlayerStore((s) => s.setMuted)
  const setPlaybackRate = useVideoPlayerStore((s) => s.setPlaybackRate)
  const setError = useVideoPlayerStore((s) => s.setError)
  const clearError = useVideoPlayerStore((s) => s.clearError)
  const togglePlay = useVideoPlayerStore((s) => s.togglePlay)
  const captureFrame = useVideoPlayerStore((s) => s.captureFrame)

  // ── sync external control values into store ──
  useEffect(() => {
    if (controls?.volume !== undefined) setVolume(controls.volume)
    if (controls?.muted !== undefined) setMuted(controls.muted)
    if (controls?.playbackRate !== undefined)
      setPlaybackRate(controls.playbackRate)
  }, [controls, setVolume, setMuted, setPlaybackRate])

  // ── sync <video> element muted / playbackRate when they change ──
  const volume = useVideoPlayerStore((s) => s.volume)
  const muted = useVideoPlayerStore((s) => s.muted)
  const playbackRate = useVideoPlayerStore((s) => s.playbackRate)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.volume = volume
    el.muted = muted
    el.playbackRate = playbackRate
  }, [volume, muted, playbackRate, videoRef])

  // ── cleanup on unmount ──
  useEffect(() => {
    return () => {
      const el = videoRef.current
      if (el) {
        el.pause()
        el.src = ''
      }
    }
  }, [videoRef])

  // ── reset player state when videoUrl changes ──
  useEffect(() => {
    clearError()
    setIsPlaying(false)
    setCurrentTime(0)
  }, [videoUrl, clearError, setIsPlaying, setCurrentTime])

  // ── event handlers ──
  const handlePlayPause = useCallback(() => {
    togglePlay(videoRef.current)
  }, [togglePlay, videoRef])

  const handleVideoTimeUpdate = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    setCurrentTime(el.currentTime)
    callbacks?.onTimeUpdate?.(el.currentTime)
  }, [setCurrentTime, callbacks, videoRef])

  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true)
    callbacks?.onPlay?.()
  }, [setIsPlaying, callbacks])

  const handleVideoPause = useCallback(() => {
    setIsPlaying(false)
    callbacks?.onPause?.()
  }, [setIsPlaying, callbacks])

  const handleCaptureKeyframe = useCallback(async () => {
    const dataUrl = await captureFrame(videoRef.current, canvasRef.current)
    if (!dataUrl) return

    setCaptureFlash(true)
    setTimeout(() => setCaptureFlash(false), 300)

    callbacks?.onCaptureFrame?.(dataUrl)
  }, [captureFrame, callbacks, videoRef])

  // ── derive UI visibility ──
  const showKeyframeBtn = isHovering || (!isPlaying && !!videoUrl)

  // ── render ──
  return (
    <div
      className={cn(
        'relative bg-black flex items-center justify-center w-full h-full min-h-[200px]',
        hasError && 'border-2 border-destructive'
      )}
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

      {/* Error banner */}
      {hasError && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-destructive/90 text-destructive-foreground text-xs px-3 py-1.5 text-center pointer-events-none">
          {errorMessage || '视频播放出错'}
        </div>
      )}

      {/* Keyframe capture button */}
      {showKeyframeBtn && callbacks?.onCaptureFrame && (
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

      {/* Native <video> element */}
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

      {/* Play button (visible when paused) */}
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

export default VideoPlayer
