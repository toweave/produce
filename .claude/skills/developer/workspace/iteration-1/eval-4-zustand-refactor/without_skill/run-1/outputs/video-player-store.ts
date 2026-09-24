/**
 * VideoPlayerStore
 *
 * A standalone zustand store that manages all video player internal state.
 * By extracting state management from the component, we eliminate the need
 * for the parent to pass control props (isPlaying, currentTime, volume, etc.)
 * and callback props (onPlay, onPause, onTimeUpdate, etc.) individually.
 *
 * The component that uses this store only needs:
 *   - videoUrl        (source)
 *   - videoRef        (DOM ref, often needed by parent)
 *   - callbacks       (grouped notification callbacks, optional)
 */

import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoPlayerCallbacks {
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (time: number) => void
  onRateChange?: (rate: number) => void
  onCaptureFrame?: (dataUrl: string) => void
}

export interface VideoPlayerState {
  // Playback state
  isPlaying: boolean
  currentTime: number
  volume: number
  muted: boolean
  playbackRate: number

  // UI state
  capturing: boolean
  hasError: boolean
  errorMessage: string

  // Actions
  play: () => void
  pause: () => void
  togglePlay: () => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  setPlaybackRate: (rate: number) => void
  setCapturing: (capturing: boolean) => void
  setError: (hasError: boolean, message?: string) => void
  clearError: () => void
  reset: () => void
  setCallbacks: (callbacks: VideoPlayerCallbacks) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useVideoPlayerStore = create<VideoPlayerState>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  isPlaying: false,
  currentTime: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  capturing: false,
  hasError: false,
  errorMessage: '',

  // ── Internal: callbacks stored so the component can reference them ────
  _callbacks: {} as VideoPlayerCallbacks,

  // ── Actions ────────────────────────────────────────────────────────────

  play: () => {
    set({ isPlaying: true, hasError: false, errorMessage: '' })
    get()._callbacks.onPlay?.()
  },

  pause: () => {
    set({ isPlaying: false })
    get()._callbacks.onPause?.()
  },

  togglePlay: () => {
    const { isPlaying } = get()
    if (isPlaying) {
      get().pause()
    } else {
      get().play()
    }
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time })
    get()._callbacks.onTimeUpdate?.(time)
  },

  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)) })
  },

  setMuted: (muted: boolean) => {
    set({ muted })
  },

  setPlaybackRate: (rate: number) => {
    set({ playbackRate: rate })
    get()._callbacks.onRateChange?.(rate)
  },

  setCapturing: (capturing: boolean) => {
    set({ capturing })
  },

  setError: (hasError: boolean, message?: string) => {
    set({ hasError, errorMessage: message ?? '' })
  },

  clearError: () => {
    set({ hasError: false, errorMessage: '' })
  },

  reset: () => {
    set({
      isPlaying: false,
      currentTime: 0,
      volume: 1,
      muted: false,
      playbackRate: 1,
      capturing: false,
      hasError: false,
      errorMessage: '',
    })
  },

  setCallbacks: (callbacks: VideoPlayerCallbacks) => {
    set({ _callbacks: callbacks })
  },
}))

// ─── Selector helpers (for performance) ──────────────────────────────────────

export const selectIsPlaying = (s: VideoPlayerState) => s.isPlaying
export const selectCurrentTime = (s: VideoPlayerState) => s.currentTime
export const selectVolume = (s: VideoPlayerState) => s.volume
export const selectMuted = (s: VideoPlayerState) => s.muted
export const selectPlaybackRate = (s: VideoPlayerState) => s.playbackRate
export const selectCapturing = (s: VideoPlayerState) => s.capturing
export const selectError = (s: VideoPlayerState) => ({
  hasError: s.hasError,
  errorMessage: s.errorMessage,
})
