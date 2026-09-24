import { create } from 'zustand'

interface ProfileState {
  // Form state
  username: string
  email: string
  gender: string
  avatarDataUrl: string | null
  avatarFileName: string

  // UI state
  isDirty: boolean
  isSubmitting: boolean
  errors: Record<string, string>

  // Setters
  setUsername: (val: string) => void
  setEmail: (val: string) => void
  setGender: (val: string) => void
  setAvatar: (file: File) => Promise<void>
  clearAvatar: () => void

  // Actions
  validate: () => boolean
  save: () => Promise<void>
  reset: () => void
}

const initialData = {
  username: 'zhangsan',
  email: 'zhangsan@example.com',
  gender: 'male',
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  // Initial state
  ...initialData,
  avatarDataUrl: null,
  avatarFileName: '',
  isDirty: false,
  isSubmitting: false,
  errors: {},

  // Setters
  setUsername: (val) =>
    set({
      username: val,
      isDirty: true,
      errors: { ...get().errors, username: '' },
    }),

  setEmail: (val) =>
    set({
      email: val,
      isDirty: true,
      errors: { ...get().errors, email: '' },
    }),

  setGender: (val) => set({ gender: val, isDirty: true }),

  setAvatar: async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    set({ avatarDataUrl: dataUrl, avatarFileName: file.name, isDirty: true })
  },

  clearAvatar: () =>
    set({ avatarDataUrl: null, avatarFileName: '', isDirty: true }),

  // Actions
  validate: () => {
    const { username, email } = get()
    const errors: Record<string, string> = {}

    if (!username.trim()) {
      errors.username = '用户名不能为空'
    } else if (username.trim().length < 2) {
      errors.username = '用户名至少需要 2 个字符'
    }

    if (!email.trim()) {
      errors.email = '邮箱不能为空'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = '请输入有效的邮箱地址'
    }

    set({ errors })
    return Object.keys(errors).length === 0
  },

  save: async () => {
    if (!get().validate()) return

    set({ isSubmitting: true })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    set({ isSubmitting: false, isDirty: false, errors: {} })
  },

  reset: () => {
    set({
      ...initialData,
      avatarDataUrl: null,
      avatarFileName: '',
      isDirty: false,
      isSubmitting: false,
      errors: {},
    })
  },
}))
