import { useEffect } from 'react'

const FORM_PARAMS_KEY = 'seedance2-form-params'

interface FormParams {
  prompt?: string
  ratio?: string
  duration?: number
  resolution?: string
  generateAudio?: boolean
  watermark?: boolean
  genMode?: string
  firstFrameData?: string | null
  lastFrameData?: string | null
  firstFramePath?: string
  lastFramePath?: string
}

interface FormState {
  prompt: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
  watermark: boolean
  genMode: string
}

interface PersistenceOptions {
  formState: FormState
  update: (partial: Record<string, unknown>) => void
  isFirstFrameMode: boolean
  isFirstLastFrameMode: boolean
  firstFrameData: string | null
  firstFramePath: string
  lastFrameData: string | null
  lastFramePath: string
}

/** Restores and auto-saves form parameters to localStorage */
export function useFormPersistence({
  formState,
  update,
  isFirstFrameMode,
  isFirstLastFrameMode,
  firstFrameData,
  firstFramePath,
  lastFrameData,
  lastFramePath
}: PersistenceOptions): void {
  // Restore form params on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_PARAMS_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as FormParams
      const updates: Record<string, unknown> = {}
      if (saved.prompt) updates.prompt = saved.prompt
      if (saved.ratio) updates.ratio = saved.ratio
      if (saved.duration !== undefined) updates.duration = saved.duration
      if (saved.resolution) updates.resolution = saved.resolution
      if (saved.generateAudio !== undefined) updates.generateAudio = saved.generateAudio
      if (saved.watermark !== undefined) updates.watermark = saved.watermark
      if (saved.genMode) updates.genMode = saved.genMode
      if (Object.keys(updates).length > 0) update(updates)
    } catch { /* ignore corrupted data */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save form params on change (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const save = (): void => {
      const data: FormParams = {
        prompt: formState.prompt,
        ratio: formState.ratio,
        duration: formState.duration,
        resolution: formState.resolution,
        generateAudio: formState.generateAudio,
        watermark: formState.watermark,
        genMode: formState.genMode
      }
      if (isFirstFrameMode || isFirstLastFrameMode) {
        if (firstFrameData && firstFrameData.length < 2 * 1024 * 1024) {
          data.firstFrameData = firstFrameData
        }
        data.firstFramePath = firstFramePath
      }
      if (isFirstLastFrameMode) {
        if (lastFrameData && lastFrameData.length < 2 * 1024 * 1024) {
          data.lastFrameData = lastFrameData
        }
        data.lastFramePath = lastFramePath
      }
      try {
        localStorage.setItem(FORM_PARAMS_KEY, JSON.stringify(data))
      } catch { /* localStorage full */ }
    }

    if (timer) clearTimeout(timer)
    timer = setTimeout(save, 500)
    return () => { if (timer) clearTimeout(timer) }
  }, [
    formState.prompt, formState.ratio, formState.duration,
    formState.resolution, formState.generateAudio, formState.watermark,
    formState.genMode, isFirstFrameMode, isFirstLastFrameMode,
    firstFrameData, firstFramePath, lastFrameData, lastFramePath
  ])
}
