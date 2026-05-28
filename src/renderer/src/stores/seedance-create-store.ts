import { create } from 'zustand'
import type { Ratio, Resolution } from '@/pages/seedance/types'

const STORAGE_DIRS_KEY = 'seedance-storage-dirs'
const STORAGE_CURRENT_KEY = 'seedance-storage-current'

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
  setStorageDirs: (val: string[]) => void
  setCurrentDir: (val: string) => void

  // Compound actions
  clearImage: () => void
  selectImage: () => Promise<void>
  selectLastFrame: () => Promise<void>
  handleStorageChange: (val: string) => Promise<void>
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
  }
}))
