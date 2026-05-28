import { create } from 'zustand'
import type { Ratio, Resolution } from '@/pages/seedance/types'

const STORAGE_DIRS_KEY = 'seedance-storage-dirs'
const STORAGE_CURRENT_KEY = 'seedance-storage-current'

const STORAGE_LAST_SESSION_KEY = 'seedance-last-session'

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

interface SeedanceCreateState {
  // Form state
  prompt: string
  imageData: string | null
  firstFramePath: string
  useLastFrame: boolean
  lastFrameData: string | null
  lastFramePath: string
  ratio: Ratio
  duration: number
  resolution: Resolution
  generateAudio: boolean
  watermark: boolean

  // UI state
  error: string
  apiKeyMissing: boolean
  submitting: boolean
  createdId: string

  // Task state
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

  // Storage
  storageDirs: string[]
  currentDir: string

  // Simple setters
  setPrompt: (val: string) => void
  setImageData: (val: string | null) => void
  setFirstFramePath: (val: string) => void
  setUseLastFrame: (val: boolean) => void
  setLastFrameData: (val: string | null) => void
  setLastFramePath: (val: string) => void
  setRatio: (val: Ratio) => void
  setDuration: (val: number) => void
  setResolution: (val: Resolution) => void
  setGenerateAudio: (val: boolean) => void
  setWatermark: (val: boolean) => void
  setError: (val: string) => void
  setApiKeyMissing: (val: boolean) => void
  setSubmitting: (val: boolean) => void
  setCreatedId: (val: string) => void
  setTaskStatus: (val: string) => void
  setVideoUrl: (val: string) => void
  setPollError: (val: string) => void
  setIsPlaying: (val: boolean) => void
  setHasInteracted: (val: boolean) => void
  setCurrentTime: (val: number) => void
  setCaptureFlash: (val: boolean) => void
  setCapturingAuto: (val: boolean) => void
  setAutoKeyframes: (val: string[]) => void
  setManualKeyframes: (val: string[]) => void
  setStorageDirs: (val: string[]) => void
  setCurrentDir: (val: string) => void

  // Compound actions
  clearImage: () => void
  selectImage: () => Promise<void>
  selectLastFrame: () => Promise<void>
  handleStorageChange: (val: string) => Promise<void>
  resetPanel: () => void
  addManualKeyframe: (dataUrl: string) => void
  removeManualKeyframe: (index: number) => void
  clearKeyframes: () => void
  captureKeyframe: (videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) => Promise<void>
}

export const useSeedanceCreateStore = create<SeedanceCreateState>()((set, get) => ({
  // Initial state
  prompt: '',
  imageData: null,
  firstFramePath: '',
  useLastFrame: true,
  lastFrameData: null,
  lastFramePath: '',
  ratio: '16:9' as Ratio,
  duration: -1,
  resolution: '1080p' as Resolution,
  generateAudio: true,
  watermark: false,
  error: '',
  apiKeyMissing: false,
  submitting: false,
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
  storageDirs: [],
  currentDir: '',

  // Simple setters
  setPrompt: (val) => set({ prompt: val }),
  setImageData: (val) => set({ imageData: val }),
  setFirstFramePath: (val) => set({ firstFramePath: val }),
  setUseLastFrame: (val) => set({ useLastFrame: val }),
  setLastFrameData: (val) => set({ lastFrameData: val }),
  setLastFramePath: (val) => set({ lastFramePath: val }),
  setRatio: (val) => set({ ratio: val }),
  setDuration: (val) => set({ duration: val }),
  setResolution: (val) => set({ resolution: val }),
  setGenerateAudio: (val) => set({ generateAudio: val }),
  setWatermark: (val) => set({ watermark: val }),
  setError: (val) => set({ error: val }),
  setApiKeyMissing: (val) => set({ apiKeyMissing: val }),
  setSubmitting: (val) => set({ submitting: val }),
  setCreatedId: (val) => set({ createdId: val }),
  setTaskStatus: (val) => set({ taskStatus: val }),
  setVideoUrl: (val) => set({ videoUrl: val }),
  setPollError: (val) => set({ pollError: val }),
  setIsPlaying: (val) => set({ isPlaying: val }),
  setHasInteracted: (val) => set({ hasInteracted: val }),
  setCurrentTime: (val) => set({ currentTime: val }),
  setCaptureFlash: (val) => set({ captureFlash: val }),
  setCapturingAuto: (val) => set({ capturingAuto: val }),
  setAutoKeyframes: (val) => set({ autoKeyframes: val }),
  setManualKeyframes: (val) => set({ manualKeyframes: val }),
  setStorageDirs: (val) => set({ storageDirs: val }),
  setCurrentDir: (val) => set({ currentDir: val }),

  // Compound actions
  clearImage: () => set({ imageData: null, firstFramePath: '' }),

  selectImage: async () => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    set({ imageData: base64, firstFramePath: filePath })
  },

  selectLastFrame: async () => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    set({ lastFrameData: base64, lastFramePath: filePath })
  },

  handleStorageChange: async (val) => {
    if (val === '__add__') {
      const dir = await window.api.dialog.selectDirectory()
      if (dir) {
        const { storageDirs } = get()
        if (!storageDirs.includes(dir)) {
          const newDirs = [...storageDirs, dir]
          set({ storageDirs: newDirs, currentDir: dir })
          localStorage.setItem(STORAGE_DIRS_KEY, JSON.stringify(newDirs))
          localStorage.setItem(STORAGE_CURRENT_KEY, dir)
        } else {
          set({ currentDir: dir })
          localStorage.setItem(STORAGE_CURRENT_KEY, dir)
        }
      }
    } else {
      set({ currentDir: val })
      localStorage.setItem(STORAGE_CURRENT_KEY, val)
    }
  },

  resetPanel: () =>
    set({
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
      manualKeyframes: []
    }),

  addManualKeyframe: (dataUrl) =>
    set((s) => ({ manualKeyframes: [...s.manualKeyframes, dataUrl] })),

  removeManualKeyframe: (index) =>
    set((s) => ({
      manualKeyframes: s.manualKeyframes.filter((_, i) => i !== index)
    })),

  clearKeyframes: () => set({ autoKeyframes: [], manualKeyframes: [] }),

  captureKeyframe: async (videoEl, canvasEl) => {
    const dataUrl = captureFrameToDataUrl(videoEl, canvasEl)
    if (!dataUrl || !dataUrl.match(/^data:image\//)) return

    const { manualKeyframes, currentDir, createdId } = get()
    const index = manualKeyframes.length
    set({ manualKeyframes: [...manualKeyframes, dataUrl], captureFlash: true })
    setTimeout(() => set({ captureFlash: false }), 300)

    try {
      await window.api.file.saveKeyframe({
        base64Data: dataUrl,
        destDir: currentDir,
        filename: `Seedance_${createdId}_manual_${index}`
      })
      const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        session.manualCount = index + 1
        localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify(session))
      }
    } catch {
      console.error('关键帧保存失败')
    }
  }
}))
