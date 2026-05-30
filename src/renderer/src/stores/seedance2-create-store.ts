import { create } from 'zustand'

interface Seedance2CreateState {
  // Task state
  createdId: string
  taskStatus: string
  videoUrl: string
  pollError: string

  // Player state
  isPlaying: boolean
  hasInteracted: boolean
  currentTime: number
  captureFlash: boolean

  // Keyframe state
  capturingAuto: boolean
  autoKeyframes: string[]
  manualKeyframes: string[]

  // Generic updater (replaces individual simple setters)
  update: (partial: Partial<Seedance2CreateState>) => void

  // Compound actions
  resetPanel: () => void
  addManualKeyframe: (dataUrl: string) => void
  removeManualKeyframe: (index: number) => void
  clearKeyframes: () => void
}

export const useSeedance2CreateStore = create<Seedance2CreateState>()((set) => ({
  // Initial state
  createdId: '',
  taskStatus: '',
  videoUrl: '',
  pollError: '',
  isPlaying: false,
  hasInteracted: false,
  currentTime: 0,
  captureFlash: false,
  capturingAuto: false,
  autoKeyframes: [],
  manualKeyframes: [],

  // Generic updater
  update: (partial) => set(partial),

  // Compound actions
  resetPanel: () =>
    set({
      createdId: '', taskStatus: '', videoUrl: '', pollError: '',
      isPlaying: false, hasInteracted: false, currentTime: 0, captureFlash: false,
      capturingAuto: false, autoKeyframes: [], manualKeyframes: []
    }),

  addManualKeyframe: (dataUrl) =>
    set((s) => ({ manualKeyframes: [...s.manualKeyframes, dataUrl] })),

  removeManualKeyframe: (index) =>
    set((s) => ({ manualKeyframes: s.manualKeyframes.filter((_, i) => i !== index) })),

  clearKeyframes: () => set({ autoKeyframes: [], manualKeyframes: [] })
}))
