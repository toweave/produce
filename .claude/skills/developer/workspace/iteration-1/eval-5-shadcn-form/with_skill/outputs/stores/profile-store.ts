import { create } from 'zustand'

export type Gender = '' | 'male' | 'female' | 'other'

interface ProfileState {
  // Form state
  username: string
  email: string
  gender: Gender
  avatarData: string | null
  saving: boolean

  // Actions
  setUsername: (val: string) => void
  setEmail: (val: string) => void
  setGender: (val: Gender) => void
  setAvatarData: (val: string | null) => void
  setSaving: (val: boolean) => void
  saveProfile: () => Promise<void>
  resetForm: () => void
}

const initialState = {
  username: '',
  email: '',
  gender: '' as Gender,
  avatarData: null as string | null,
  saving: false,
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  ...initialState,

  setUsername: (val) => set({ username: val }),
  setEmail: (val) => set({ email: val }),
  setGender: (val) => set({ gender: val }),
  setAvatarData: (val) => set({ avatarData: val }),
  setSaving: (val) => set({ saving: val }),

  saveProfile: async () => {
    const { username, email, gender, avatarData } = get()
    set({ saving: true })

    try {
      // Simulate API call — in production, this would invoke an IPC channel
      console.log('Saving profile:', { username, email, gender, avatarData })
      await new Promise((resolve) => setTimeout(resolve, 800))
      // On success: localStorage is used here for demo purposes only
      // Production code should persist via IPC + better-sqlite3
      localStorage.setItem('profile', JSON.stringify({ username, email, gender, avatarData }))
    } finally {
      set({ saving: false })
    }
  },

  resetForm: () => set(initialState),
}))
