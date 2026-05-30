import React, { useState, useCallback, useRef, useEffect } from 'react'
import { VideoIcon, UploadIcon, X, ImageIcon, FilmIcon, AudioLinesIcon, SettingsIcon, Loader2Icon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'

import type { ModelId, Ratio, Resolution } from '../../types'
import { MODELS, DURATION_OPTIONS, RATIO_OPTIONS, RESOLUTION_OPTIONS, AUDIO_OPTIONS } from '../../constants'
import { handleApiError } from '@/lib/api-errors'

const IMAGE_FILTERS: Electron.FileFilter[] = [
  { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'heic', 'heif'] }
]

const VIDEO_FILTERS: Electron.FileFilter[] = [
  { name: '视频', extensions: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv'] }
]

const AUDIO_FILTERS: Electron.FileFilter[] = [
  { name: '音频', extensions: ['mp3', 'wav'] }
]

interface MediaItem {
  id: string
  dataUri?: string
  filePath?: string
  name: string
}

let idCounter = 0
function generateId(): string {
  return `media_${++idCounter}_${Math.random().toString(36).substring(2, 8)}`
}

interface CapturedFrameData {
  type: 'first-frame' | 'last-frame' | 'reference-image'
  dataUrl: string
}

type GenerationMode = 'first-frame' | 'first-last-frame' | 'multi-modal-ref'

const GEN_MODE_OPTIONS: { value: GenerationMode; label: string; desc: string }[] = [
  { value: 'first-frame', label: '首帧生视频', desc: '1 张参考图 + 提示词' },
  { value: 'first-last-frame', label: '首尾帧生视频', desc: '首帧 + 尾帧 + 提示词' },
  { value: 'multi-modal-ref', label: '多模态参考', desc: '多图/视频/音频 + 提示词' }
]

export interface CreateFormMeta {
  generationMode: GenerationMode
  prompt: string
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
  watermark: boolean
  returnLastFrame: boolean
  webSearch: boolean
  priority: number
  seed: number
  executionExpiresAfter: number
  callbackUrl: string
  safetyIdentifier: string
  images: Array<{ filePath?: string; name: string; dataUri?: string }>
  videos: Array<{ filePath?: string; name: string; dataUri?: string }>
  audioFiles: Array<{ filePath?: string; name: string; dataUri?: string }>
}

interface CreateFormProps {
  onSubmit: (apiParams: Record<string, unknown>, meta: CreateFormMeta) => Promise<{ id: string } | undefined>
  storageDirs: string[]
  currentDir: string
  onStorageChange: (val: string) => Promise<void>
  /** Restore form params from a previous session on mount */
  initialParams?: CreateFormMeta | null
  /** Captured frame data from the keyframe grid, processed via useEffect */
  capturedFrame?: CapturedFrameData | null
  /** Notify parent of generation mode changes */
  onGenModeChange?: (mode: string) => void
}

export function CreateForm({ onSubmit, storageDirs, currentDir, onStorageChange, initialParams, capturedFrame, onGenModeChange }: CreateFormProps): React.JSX.Element {
  const navigate = useNavigate()

  // Generation mode
  const [genMode, setGenMode] = useState<GenerationMode>(initialParams?.generationMode || 'multi-modal-ref')

  // Form state
  const [model, setModel] = useState<ModelId>((initialParams?.model || 'doubao-seedance-2-0-260128') as ModelId)
  const [prompt, setPrompt] = useState(initialParams?.prompt || '')

  // Restore initial params when available (may arrive async from session restore)
  const restoredRef = useRef(false)
  useEffect(() => {
    if (!initialParams || restoredRef.current) return
    restoredRef.current = true
    const restoredGenMode = (initialParams.generationMode || 'multi-modal-ref') as GenerationMode
    setGenMode(restoredGenMode)
    onGenModeChange?.(restoredGenMode)
    setModel((initialParams.model || 'doubao-seedance-2-0-260128') as ModelId)
    setPrompt(initialParams.prompt || '')
    setRatio((initialParams.ratio || '16:9') as Ratio)
    setDuration(initialParams.duration || -1)
    setResolution((initialParams.resolution || '720p') as Resolution)
    setGenerateAudio(initialParams.generateAudio ?? true)
    setWatermark(initialParams.watermark ?? false)
    setWebSearch(initialParams.webSearch ?? false)
    setReturnLastFrame(initialParams.returnLastFrame ?? false)
    setPriority(initialParams.priority ?? 0)
    setSeed(initialParams.seed ?? -1)
    setExecutionExpiresAfter(initialParams.executionExpiresAfter ?? 172800)
    setCallbackUrl(initialParams.callbackUrl || '')
    setSafetyIdentifier(initialParams.safetyIdentifier || '')
    // Restore images
    if (initialParams.generationMode === 'first-frame' || initialParams.generationMode === 'first-last-frame') {
      setImageData(initialParams.images?.[0]?.dataUri || null)
      setImageFilePath(initialParams.images?.[0]?.filePath || '')
      setImageName(initialParams.images?.[0]?.name || '')
    }
    if (initialParams.generationMode === 'first-last-frame' && initialParams.images?.[1]) {
      setLastFrameData(initialParams.images[1].dataUri || null)
    }
    if (initialParams.generationMode === 'multi-modal-ref') {
      setImages(initialParams.images.map((img, idx) => ({
        id: generateId(),
        dataUri: img.dataUri,
        filePath: img.filePath,
        name: img.name || `image ${idx + 1}`
      })))
      setVideos(initialParams.videos.map((v, idx) => ({
        id: generateId(),
        dataUri: v.dataUri,
        filePath: v.filePath,
        name: v.name || `video ${idx + 1}`
      })))
      setAudioFiles(initialParams.audioFiles.map((a, idx) => ({
        id: generateId(),
        dataUri: a.dataUri,
        filePath: a.filePath,
        name: a.name || `audio ${idx + 1}`
      })))
    }
  }, [initialParams, onGenModeChange])

  // Process captured frames from the KeyframeGrid (first/last/reference-image)
  useEffect(() => {
    if (!capturedFrame) return

    switch (capturedFrame.type) {
      case 'first-frame': {
        setImageData(capturedFrame.dataUrl)
        setImageFilePath('')
        setImageName(`截图首帧 - ${new Date().toLocaleTimeString()}`)
        break
      }
      case 'last-frame': {
        setLastFrameData(capturedFrame.dataUrl)
        break
      }
      case 'reference-image': {
        setImages((prev) => {
          if (prev.length >= 9) return prev
          // Avoid inserting duplicates
          if (prev.some((img) => img.dataUri === capturedFrame.dataUrl)) return prev
          return [...prev, { id: generateId(), dataUri: capturedFrame.dataUrl, name: `截图参考 ${prev.length + 1}` }]
        })
        break
      }
    }
  }, [capturedFrame])

  // Images depend on mode: first-frame (one image), first-last-frame (two images), multi-modal (array)
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageFilePath, setImageFilePath] = useState<string>('')
  const [imageName, setImageName] = useState('')
  const [lastFrameData, setLastFrameData] = useState<string | null>(null)
  const [images, setImages] = useState<MediaItem[]>([])

  const [videos, setVideos] = useState<MediaItem[]>([])
  const [audioFiles, setAudioFiles] = useState<MediaItem[]>([])
  const [ratio, setRatio] = useState<Ratio>('16:9')
  const [duration, setDuration] = useState(-1)
  const [resolution, setResolution] = useState<Resolution>('720p')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [watermark, setWatermark] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [returnLastFrame, setReturnLastFrame] = useState(false)
  const [priority, setPriority] = useState(0)
  const [seed, setSeed] = useState(-1)
  const [executionExpiresAfter, setExecutionExpiresAfter] = useState(172800)
  const [callbackUrl, setCallbackUrl] = useState('')
  const [safetyIdentifier, setSafetyIdentifier] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  const isFast = model === 'doubao-seedance-2-0-fast-260128'
  const hasMedia = images.length > 0 || videos.length > 0 || audioFiles.length > 0 || !!imageData

  // Switch generation mode — clear incompatible state
  const handleModeChange = useCallback((mode: GenerationMode) => {
    setGenMode(mode)
    onGenModeChange?.(mode)
    // Clear incompatible media on mode switch
    if (mode !== 'multi-modal-ref') {
      setImages([])
      setVideos([])
      setAudioFiles([])
    }
    if (mode === 'multi-modal-ref') {
      setImageData(null)
      setImageFilePath('')
      setImageName('')
      setLastFrameData(null)
    }
    if (mode === 'first-frame') {
      setLastFrameData(null)
    }
  }, [onGenModeChange])

  const handleAddImage = useCallback(async () => {
    if (genMode === 'first-frame' && imageData) return
    if (genMode === 'first-last-frame') {
      // In first-last-frame mode, clicks on the image area are handled separately
      return
    }
    if (images.length >= 9) return
    const filePath = await window.api.dialog.openFile(IMAGE_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'image'
    setImages((prev) => [...prev, { id: generateId(), dataUri, filePath, name }])
  }, [genMode, imageData, images.length])

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const handleSelectFirstFrame = useCallback(async () => {
    const filePath = await window.api.dialog.openFile(IMAGE_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'first-frame'
    setImageData(dataUri)
    setImageFilePath(filePath)
    setImageName(name)
  }, [])

  const handleClearFirstFrame = useCallback(() => {
    setImageData(null)
    setImageFilePath('')
    setImageName('')
  }, [])

  const handleSelectLastFrame = useCallback(async () => {
    const filePath = await window.api.dialog.openFile(IMAGE_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    setLastFrameData(dataUri)
  }, [])

  const handleClearLastFrame = useCallback(() => {
    setLastFrameData(null)
  }, [])

  const handleAddVideoFile = useCallback(async () => {
    if (videos.length >= 3) return
    const filePath = await window.api.dialog.openFile(VIDEO_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'video'
    setVideos((prev) => [...prev, { id: generateId(), dataUri, filePath, name }])
  }, [videos.length])

  const handleAddVideoUrl = useCallback(() => {
    if (videos.length >= 3) return
    setVideos((prev) => [...prev, { id: generateId(), name: `video ${prev.length + 1}`, dataUri: '' }])
  }, [videos.length])

  const handleAddAudio = useCallback(async () => {
    if (audioFiles.length >= 3) return
    const filePath = await window.api.dialog.openFile(AUDIO_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'audio'
    setAudioFiles((prev) => [...prev, { id: generateId(), dataUri, filePath, name }])
  }, [audioFiles.length])

  const handleRemoveAudio = useCallback((id: string) => {
    setAudioFiles((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleSubmit = async () => {
    // Mode-specific validation
    if (genMode === 'first-frame' && !imageData && !prompt.trim()) {
      setError('首帧生视频请至少上传一张首帧图片或输入提示词')
      return
    }
    if (genMode === 'first-last-frame') {
      if (!imageData) {
        setError('首尾帧生视频需要上传首帧图片')
        return
      }
      if (!lastFrameData) {
        setError('首尾帧生视频需要上传尾帧图片')
        return
      }
    }
    if (genMode === 'multi-modal-ref') {
      if (!prompt.trim() && !hasMedia) {
        setError('请输入提示词或上传参考素材')
        return
      }
      if (audioFiles.length > 0 && images.length === 0 && videos.length === 0) {
        setError('音频不能单独使用，请至少上传一张图片或一个视频')
        return
      }
    }
    if (!prompt.trim() && webSearch) {
      setError('联网搜索仅支持纯文本输入，请输入提示词')
      return
    }

    setError('')
    setApiKeyMissing(false)
    setSubmitting(true)

    try {
      const content: Record<string, unknown>[] = []
      if (prompt.trim()) {
        content.push({ type: 'text', text: prompt.trim() })
      }

      if (genMode === 'first-frame' && imageData) {
        content.push({ type: 'image_url', image_url: { url: imageData }, role: 'first_frame' })
      } else if (genMode === 'first-last-frame') {
        if (imageData) content.push({ type: 'image_url', image_url: { url: imageData }, role: 'first_frame' })
        if (lastFrameData) content.push({ type: 'image_url', image_url: { url: lastFrameData }, role: 'last_frame' })
      } else {
        // multi-modal-ref
        for (const img of images) {
          content.push({ type: 'image_url', image_url: { url: img.dataUri }, role: 'reference_image' })
        }
        for (const v of videos) {
          content.push({ type: 'video_url', video_url: { url: v.dataUri }, role: 'reference_video' })
        }
        for (const a of audioFiles) {
          content.push({ type: 'audio_url', audio_url: { url: a.dataUri }, role: 'reference_audio' })
        }
      }

      const params: Record<string, unknown> = {
        model,
        content,
        ratio,
        duration,
        resolution,
        generate_audio: generateAudio,
        watermark
      }

      if (returnLastFrame) {
        params.return_last_frame = true
      }
      if (webSearch && !hasMedia && !imageData) {
        params.tools = [{ type: 'web_search' }]
      }
      if (priority > 0) {
        params.priority = priority
      }
      if (seed >= 0) {
        params.seed = seed
      }
      if (executionExpiresAfter !== 172800) {
        params.execution_expires_after = executionExpiresAfter
      }
      if (callbackUrl.trim()) {
        params.callback_url = callbackUrl.trim()
      }
      if (safetyIdentifier.trim()) {
        params.safety_identifier = safetyIdentifier.trim()
      }

      const meta: CreateFormMeta = {
        generationMode: genMode,
        prompt: prompt.trim(),
        model,
        ratio,
        duration,
        resolution,
        generateAudio,
        watermark,
        returnLastFrame,
        webSearch,
        priority,
        seed,
        executionExpiresAfter,
        callbackUrl: callbackUrl.trim(),
        safetyIdentifier: safetyIdentifier.trim(),
        images: genMode === 'multi-modal-ref'
          ? images.map((i) => ({ filePath: i.filePath, name: i.name, dataUri: i.dataUri }))
          : (imageData ? [{ filePath: imageFilePath, name: imageName, dataUri: imageData }] : []),
        videos: genMode === 'multi-modal-ref'
          ? videos.map((v) => ({ filePath: v.filePath, name: v.name, dataUri: v.dataUri }))
          : [],
        audioFiles: genMode === 'multi-modal-ref'
          ? audioFiles.map((a) => ({ filePath: a.filePath, name: a.name, dataUri: a.dataUri }))
          : []
      }

      // Show loading toast while waiting for the API response
      const toastId = toast.loading('正在创建生成任务...')
      try {
        const result = await onSubmit(params, meta) as { id: string } | undefined
        toast.success('视频生成任务已创建', {
          id: toastId,
          description: result?.id ? `任务 ID: ${result.id.slice(0, 12)}...` : undefined
        })
        if (!result) return
      } catch (submitErr) {
        toast.error('创建任务失败', { id: toastId })
        throw submitErr
      }
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '2.0', '创建任务失败')
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <VideoIcon className="size-6" />
          视频创作
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          使用 Doubao-Seedance-2.0 系列模型生成视频
        </p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel>模型</FieldLabel>
          <FieldContent>
            <Select
              value={model}
              onValueChange={(v) => {
                setModel(v as ModelId)
                if (v === 'doubao-seedance-2-0-fast-260128' && resolution === '1080p') {
                  setResolution('720p')
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel>提示词</FieldLabel>
          <FieldContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要生成的视频内容，例如：写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近..."
              rows={4}
            />
            <FieldDescription>
              中文不超过 500 字，英文不超过 1000 词
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      {/* Generation Mode Selector */}
      <FieldGroup>
        <Field>
          <FieldLabel>生成模式</FieldLabel>
          <FieldContent>
            <div className="flex gap-1.5 flex-wrap">
              {GEN_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleModeChange(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    genMode === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <FieldDescription>
              {GEN_MODE_OPTIONS.find((o) => o.value === genMode)?.desc}
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      {/* Reference materials — mode-dependent */}
      <FieldGroup>
        <Field>
          <FieldLabel>参考素材</FieldLabel>
          <FieldContent className="space-y-4">
            {/* --- Mode: first-frame / first-last-frame images in a horizontal row --- */}
            {(genMode === 'first-frame' || genMode === 'first-last-frame') && (
              <div className="flex flex-row gap-3">
                {imageData ? (
                  <div className="relative size-28 rounded-lg border border-border overflow-hidden">
                    <img src={imageData} alt="首帧" className="size-full object-cover" />
                    <Button
                      size="icon"
                      className="rounded-full absolute -top-2 -right-2 size-5 cursor-pointer"
                      onClick={handleClearFirstFrame}
                    >
                      <X className="size-2.5" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={handleSelectFirstFrame}
                    className="flex flex-col items-center justify-center size-28 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <ImageIcon className="size-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">选择首帧图</span>
                  </div>
                )}

                {genMode === 'first-last-frame' && (
                  lastFrameData ? (
                    <div className="relative size-28 rounded-lg border border-border overflow-hidden">
                      <img src={lastFrameData} alt="尾帧" className="size-full object-cover" />
                      <Button
                        size="icon"
                        className="rounded-full absolute -top-2 -right-2 size-5 cursor-pointer"
                        onClick={handleClearLastFrame}
                      >
                        <X className="size-2.5" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={handleSelectLastFrame}
                      className="flex flex-col items-center justify-center size-28 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <ImageIcon className="size-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">选择尾帧图</span>
                    </div>
                  )
                )}
              </div>
            )}

            {/* --- Mode: multi-modal-ref — images grid (5 default, up to 9) --- */}
            {genMode === 'multi-modal-ref' && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">参考图片（{images.length}/9）</p>
                <div className="flex flex-wrap gap-3">
                  {(() => {
                    const totalSlots = Math.min(9, Math.max(5, images.length + (images.length < 9 ? 1 : 0)))
                    return Array.from({ length: totalSlots }, (_, i) => {
                      if (i < images.length) {
                        const img = images[i]
                        return (
                          <div key={img.id} className="relative size-24 rounded-lg border border-border overflow-hidden">
                            <img src={img.dataUri} alt={img.name} className="size-full object-cover" />
                            <Button
                              size="icon"
                              className="rounded-full absolute -top-2 -right-2 size-5 cursor-pointer"
                              onClick={() => handleRemoveImage(img.id)}
                            >
                              <X className="size-2.5" />
                            </Button>
                          </div>
                        )
                      }
                      return (
                        <div
                          key={`empty-${i}`}
                          onClick={handleAddImage}
                          className="flex flex-col items-center justify-center size-24 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
                        >
                          <ImageIcon className="size-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">添加图片</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* Videos — multi-modal-ref only */}
            {genMode === 'multi-modal-ref' && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">参考视频（{videos.length}/3）</p>
                <div className="space-y-2">
                  {videos.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-2">
                      {v.filePath ? (
                        <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                          <FilmIcon className="size-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{v.name}</span>
                        </div>
                      ) : (
                        <input
                          value={v.dataUri || ''}
                          onChange={(e) => {
                            setVideos((prev) => {
                              const next = [...prev]
                              next[i] = { ...next[i], dataUri: e.target.value }
                              return next
                            })
                          }}
                          placeholder="输入视频公网 URL"
                          className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-destructive"
                        onClick={() => setVideos((prev) => prev.filter((x) => x.id !== v.id))}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {videos.length < 3 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAddVideoFile}>
                        <UploadIcon className="size-4" />
                        上传视频文件
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleAddVideoUrl}>
                        <FilmIcon className="size-4" />
                        添加视频 URL
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio — multi-modal-ref only */}
            {genMode === 'multi-modal-ref' && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">参考音频（{audioFiles.length}/3）</p>
                <div className="flex flex-wrap gap-2">
                  {audioFiles.map((a) => (
                    <div key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                      <AudioLinesIcon className="size-4 text-muted-foreground" />
                      <span className="truncate max-w-[160px]">{a.name}</span>
                      <Button variant="ghost" size="icon" className="size-5 text-destructive hover:text-destructive/80" onClick={() => handleRemoveAudio(a.id)}>
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                  {audioFiles.length < 3 && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleAddAudio}>
                      <UploadIcon className="size-4" />
                      添加音频
                    </Button>
                  )}
                </div>
              </div>
            )}
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>宽高比</FieldLabel>
          <FieldContent>
            <Select value={ratio} onValueChange={(v) => setRatio(v as Ratio)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATIO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>时长</FieldLabel>
          <FieldContent>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>分辨率</FieldLabel>
          <FieldContent>
            <Select value={resolution} onValueChange={(v) => setResolution(v as Resolution)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.filter((opt) => !isFast || opt.value !== '1080p').map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>音频</FieldLabel>
          <FieldContent>
            <Select
              value={String(generateAudio)}
              onValueChange={(v) => setGenerateAudio(v === 'true')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIO_OPTIONS.map((opt) => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      </div>

      <FieldGroup>
        <Field orientation="horizontal" className="gap-2">
          <Checkbox
            id="watermark"
            checked={watermark}
            onCheckedChange={(checked) => setWatermark(!!checked)}
          />
          <Label htmlFor="watermark" className="text-sm cursor-pointer">
            添加水印
          </Label>
        </Field>
        <Field orientation="horizontal" className="gap-2">
          <Checkbox
            id="returnLastFrame"
            checked={returnLastFrame}
            onCheckedChange={(checked) => setReturnLastFrame(!!checked)}
          />
          <Label htmlFor="returnLastFrame" className="text-sm cursor-pointer">
            返回尾帧图片
          </Label>
        </Field>
        <Field orientation="horizontal" className="gap-2">
          <Checkbox
            id="webSearch"
            checked={webSearch}
            onCheckedChange={(checked) => setWebSearch(checked === true)}
            disabled={hasMedia}
          />
          <Label htmlFor="webSearch" className={`text-sm ${hasMedia ? 'text-muted-foreground' : 'cursor-pointer'}`}>
            联网搜索
            {hasMedia && <span className="text-xs text-muted-foreground ml-1">（仅纯文本模式可用）</span>}
          </Label>
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel>优先级（0-9，越大越优先）</FieldLabel>
          <FieldContent>
            <input
              type="number"
              min={0}
              max={9}
              value={priority}
              onChange={(e) => setPriority(Math.min(9, Math.max(0, Number(e.target.value))))}
              className="w-20 h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      {/* Advanced Settings - Collapsible */}
      <FieldGroup>
        <Field orientation="horizontal" className="gap-2 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? <ChevronDownIcon className="size-4 text-muted-foreground" /> : <ChevronRightIcon className="size-4 text-muted-foreground" />}
          <span className="text-sm font-medium text-muted-foreground select-none">高级设置</span>
        </Field>
        {showAdvanced && (
          <FieldContent className="space-y-4 pt-2">
            {/* Seed */}
            <Field>
              <FieldLabel>随机种子（-1 为随机）</FieldLabel>
              <FieldContent>
                <input
                  type="number"
                  min={-1}
                  max={4294967295}
                  value={seed}
                  onChange={(e) => setSeed(Math.min(4294967295, Math.max(-1, Number(e.target.value))))}
                  className="w-28 h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <FieldDescription>相同 seed 值会生成相似结果</FieldDescription>
              </FieldContent>
            </Field>

            {/* Execution expires after */}
            <Field>
              <FieldLabel>任务超时（秒）</FieldLabel>
              <FieldContent>
                <input
                  type="number"
                  min={3600}
                  max={259200}
                  value={executionExpiresAfter}
                  onChange={(e) => setExecutionExpiresAfter(Math.min(259200, Math.max(3600, Number(e.target.value))))}
                  className="w-28 h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <FieldDescription>范围 3600~259200，默认 172800（48小时）</FieldDescription>
              </FieldContent>
            </Field>

            {/* Callback URL */}
            <Field>
              <FieldLabel>回调 URL</FieldLabel>
              <FieldContent>
                <input
                  type="url"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://example.com/callback"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <FieldDescription>任务状态变化时推送回调通知</FieldDescription>
              </FieldContent>
            </Field>

            {/* Safety identifier */}
            <Field>
              <FieldLabel>用户标识</FieldLabel>
              <FieldContent>
                <input
                  type="text"
                  value={safetyIdentifier}
                  onChange={(e) => setSafetyIdentifier(e.target.value)}
                  placeholder="用户唯一标识符（哈希值）"
                  maxLength={64}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <FieldDescription>用于安全监测，长度不超过 64 字符</FieldDescription>
              </FieldContent>
            </Field>
          </FieldContent>
        )}
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel>存储位置</FieldLabel>
          <FieldContent>
            <Select value={currentDir} onValueChange={onStorageChange}>
              <SelectTrigger className="w-full truncate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {storageDirs.map((dir) => (
                  <SelectItem key={dir} value={dir} className="truncate">
                    {dir}
                  </SelectItem>
                ))}
                <SelectItem value="__add__">+ 添加目录...</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription className="truncate">{currentDir}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          {apiKeyMissing && (
            <button
              onClick={() => navigate('/settings/keys')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <SettingsIcon className="size-3" />
              前往设置页面配置密钥
            </button>
          )}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <><Loader2Icon data-icon="inline-start" className="animate-spin" />创建中...</>
        ) : (
          <><VideoIcon data-icon="inline-start" />生成视频</>
        )}
      </Button>
    </div>
  )
}
