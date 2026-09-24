import { create } from 'zustand'

/**
 * VideoPlayer shared state store.
 *
 * Cross-component video player state lives here so the VideoPlayer
 * component can stay lean (fewer than 10 props).  Consumers read the
 * fields they need via selectors; they trigger actions through the
 * compound methods below.
 */

// --------------- helpers ---------------

function captureFrameToDataUrl(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
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

// --------------- types ---------------

interface VideoPlayerState {
  /* ── player state ── */
  isPlaying: boolean
  currentTime: number
  volume: number
  muted: boolean
  playbackRate: number

  /* ── capture state ── */
  capturing: boolean

  /* ── error state ── */
  hasError: boolean
  errorMessage: string

  /* ── simple setters ── */
  setIsPlaying: (val: boolean) => void
  setCurrentTime: (val: number) => void
  setVolume: (val: number) => void
  setMuted: (val: boolean) => void
  setPlaybackRate: (val: number) => void
  setCapturing: (val: boolean) => void
  setError: (message: string) => void
  clearError: () => void

  /* ── compound actions ── */
  togglePlay: (videoEl: HTMLVideoElement | null) => void
  handleTimeUpdate: (videoEl: HTMLVideoElement | null) => void
  captureFrame: (
    videoEl: HTMLVideoElement | null,
    canvasEl: HTMLCanvasElement | null
  ) => Promise<string | null>
  resetPlayer: () => void
}

// --------------- initial values ---------------

const INITIAL_PLAYER_STATE = {
  isPlaying: false,
  currentTime: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  capturing: false,
  hasError: false,
  errorMessage: ''
} as const

// --------------- store ---------------

export const useVideoPlayerStore = create<VideoPlayerState>()((set, get) => ({
  ...INITIAL_PLAYER_STATE,

  /* simple setters */
  setIsPlaying: (val) => set({ isPlaying: val }),
  setCurrentTime: (val) => set({ currentTime: val }),
  setVolume: (val) => set({ volume: Math.max(0, Math.min(1, val)) }),
  setMuted: (val) => set({ muted: val }),
  setPlaybackRate: (val) => set({ playbackRate: val }),
  setCapturing: (val) => set({ capturing: val }),
  setError: (message) => set({ hasError: true, errorMessage: message }),
  clearError: () => set({ hasError: false, errorMessage: '' }),

  /* compound actions */
  togglePlay: (videoEl) => {
    if (!videoEl) return
    if (videoEl.paused) {
      videoEl.play().catch(() => set({ isPlaying: false }))
    } else {
      videoEl.pause()
    }
    // isPlaying will be synced by the video element's onplay/onpause events
  },

  handleTimeUpdate: (videoEl) => {
    if (videoEl) {
      set({ currentTime: videoEl.currentTime })
    }
  },

  captureFrame: async (videoEl, canvasEl) => {
    if (!videoEl || !canvasEl) return null

    const dataUrl = captureFrameToDataUrl(videoEl, canvasEl)
    if (!dataUrl || !dataUrl.match(/^data:image\//)) return null

    set({ capturing: true })
    try {
      // Compound: saving to disk can be added here when storage is configured.
      // For now, just return the data URL so the caller (or onCaptureFrame callback)
      // can handle persistence.
      return dataUrl
    } finally {
      set({ capturing: false })
    }
  },

  resetPlayer: () =>
    set({
      ...INITIAL_PLAYER_STATE
    })
}))
