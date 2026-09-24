import { useEffect } from 'react'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'

const FORM_PARAMS_KEY = 'seedance-form-params'
const STORAGE_DIRS_KEY = 'seedance-storage-dirs'
const STORAGE_CURRENT_KEY = 'seedance-storage-current'

/** Restores and auto-saves form parameters to localStorage */
export function useFormPersistence(): void {
  // Restore form params on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_PARAMS_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      const s = useSeedanceCreateStore.getState()
      const updates: Record<string, unknown> = {}
      if (saved.prompt) updates.prompt = saved.prompt
      if (saved.ratio) updates.ratio = saved.ratio
      if (saved.duration !== undefined) updates.duration = saved.duration
      if (saved.resolution) updates.resolution = saved.resolution
      if (saved.generateAudio !== undefined) updates.generateAudio = saved.generateAudio
      if (saved.watermark !== undefined) updates.watermark = saved.watermark
      if (saved.imageData) updates.imageData = saved.imageData
      if (saved.lastFrameData) updates.lastFrameData = saved.lastFrameData
      if (saved.useLastFrame !== undefined) updates.useLastFrame = saved.useLastFrame
      if (saved.firstFramePath) updates.firstFramePath = saved.firstFramePath
      if (saved.lastFramePath) updates.lastFramePath = saved.lastFramePath
      if (Object.keys(updates).length > 0) s.update(updates)
    } catch { /* ignore corrupted data */ }
  }, [])

  // Auto-save form params on change (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const formFields = [
      'prompt', 'ratio', 'duration', 'resolution',
      'generateAudio', 'watermark', 'useLastFrame',
      'firstFramePath', 'lastFramePath', 'imageData', 'lastFrameData'
    ] as const

    const unsub = useSeedanceCreateStore.subscribe((state, prev) => {
      const changed = formFields.some(
        (k) =>
          (state as unknown as Record<string, unknown>)[k] !==
          (prev as unknown as Record<string, unknown>)[k]
      )
      if (!changed) return

      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          const data: Record<string, unknown> = {
            prompt: state.prompt, ratio: state.ratio, duration: state.duration,
            resolution: state.resolution, generateAudio: state.generateAudio,
            watermark: state.watermark, useLastFrame: state.useLastFrame,
            firstFramePath: state.firstFramePath, lastFramePath: state.lastFramePath
          }
          if (state.imageData && state.imageData.length < 2 * 1024 * 1024) {
            data.imageData = state.imageData
          }
          if (state.lastFrameData && state.lastFrameData.length < 2 * 1024 * 1024) {
            data.lastFrameData = state.lastFrameData
          }
          localStorage.setItem(FORM_PARAMS_KEY, JSON.stringify(data))
        } catch { /* localStorage full */ }
      }, 500)
    })
    return () => { unsub(); if (timer) clearTimeout(timer) }
  }, [])
}

/** Initialize storage location */
export function useStorageInit(): void {
  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_DIRS_KEY)
        const savedCurrent = localStorage.getItem(STORAGE_CURRENT_KEY)
        if (saved && savedCurrent) {
          const dirs = JSON.parse(saved) as string[]
          useSeedanceCreateStore.getState().update({ storageDirs: dirs, currentDir: savedCurrent })
        } else {
          const defaultPath = await window.api.file.getDefaultPath()
          useSeedanceCreateStore.getState().update({ storageDirs: [defaultPath], currentDir: defaultPath })
          localStorage.setItem(STORAGE_DIRS_KEY, JSON.stringify([defaultPath]))
          localStorage.setItem(STORAGE_CURRENT_KEY, defaultPath)
        }
      } catch { /* ignore */ }
    }
    init()
  }, [])
}
