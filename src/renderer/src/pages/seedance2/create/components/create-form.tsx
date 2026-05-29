import React, { useState, useCallback } from 'react'
import { VideoIcon, UploadIcon, X, ImageIcon, FilmIcon, AudioLinesIcon, SettingsIcon, Loader2Icon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
import { MODELS, RATIO_OPTIONS, RESOLUTION_OPTIONS, AUDIO_OPTIONS } from '../../constants'
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

export interface CreateFormMeta {
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
  images: Array<{ filePath?: string; name: string; dataUri?: string }>
  videos: Array<{ filePath?: string; name: string; dataUri?: string }>
  audioFiles: Array<{ filePath?: string; name: string; dataUri?: string }>
}

interface CreateFormProps {
  onSubmit: (apiParams: Record<string, unknown>, meta: CreateFormMeta) => Promise<{ id: string } | undefined>
}

export function CreateForm({ onSubmit }: CreateFormProps): React.JSX.Element {
  const navigate = useNavigate()

  // Form state
  const [model, setModel] = useState<ModelId>('doubao-seedance-2-0-260128')
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<MediaItem[]>([])
  const [videos, setVideos] = useState<MediaItem[]>([])
  const [audioFiles, setAudioFiles] = useState<MediaItem[]>([])
  const [ratio, setRatio] = useState<Ratio>('adaptive')
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState<Resolution>('720p')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [watermark, setWatermark] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [returnLastFrame, setReturnLastFrame] = useState(false)
  const [priority, setPriority] = useState(0)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  const isFast = model === 'doubao-seedance-2-0-fast-260128'
  const hasMedia = images.length > 0 || videos.length > 0 || audioFiles.length > 0

  const handleAddImage = useCallback(async () => {
    if (images.length >= 9) return
    const filePath = await window.api.dialog.openFile(IMAGE_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'image'
    setImages((prev) => [...prev, { id: generateId(), dataUri, filePath, name }])
  }, [images.length])

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id))
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
    // Validation
    if (!prompt.trim() && !hasMedia) {
      setError('请输入提示词或上传参考素材')
      return
    }
    if (audioFiles.length > 0 && images.length === 0 && videos.length === 0) {
      setError('音频不能单独使用，请至少上传一张图片或一个视频')
      return
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
      for (const img of images) {
        content.push({ type: 'image_url', image_url: { url: img.dataUri }, role: 'reference_image' })
      }
      for (const v of videos) {
        content.push({ type: 'video_url', video_url: { url: v.dataUri }, role: 'reference_video' })
      }
      for (const a of audioFiles) {
        content.push({ type: 'audio_url', audio_url: { url: a.dataUri }, role: 'reference_audio' })
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
      if (webSearch && !hasMedia) {
        params.tools = [{ type: 'web_search' }]
      }
      if (priority > 0) {
        params.priority = priority
      }

      const meta: CreateFormMeta = {
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
        images: images.map((i) => ({ filePath: i.filePath, name: i.name, dataUri: i.dataUri })),
        videos: videos.map((v) => ({ filePath: v.filePath, name: v.name, dataUri: v.dataUri })),
        audioFiles: audioFiles.map((a) => ({ filePath: a.filePath, name: a.name, dataUri: a.dataUri }))
      }

      const result = await onSubmit(params, meta)
      if (!result) return
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

      <FieldGroup>
        <Field>
          <FieldLabel>参考素材（可选）</FieldLabel>
          <FieldContent className="space-y-4">
            {/* Images */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">参考图片（{images.length}/9）</p>
              <div className="flex flex-wrap gap-3">
                {images.map((img) => (
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
                ))}
                {images.length < 9 && (
                  <div
                    onClick={handleAddImage}
                    className="flex flex-col items-center justify-center size-24 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <ImageIcon className="size-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">添加图片</span>
                  </div>
                )}
              </div>
            </div>

            {/* Videos */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleAddVideoFile}
                    >
                      <UploadIcon className="size-4" />
                      上传视频文件
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={handleAddVideoUrl}
                    >
                      <FilmIcon className="size-4" />
                      添加视频 URL
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Audio */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">参考音频（{audioFiles.length}/3）</p>
              <div className="flex flex-wrap gap-2">
                {audioFiles.map((a) => (
                  <div key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                    <AudioLinesIcon className="size-4 text-muted-foreground" />
                    <span className="truncate max-w-[160px]">{a.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 text-destructive hover:text-destructive/80"
                      onClick={() => handleRemoveAudio(a.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
                {audioFiles.length < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={handleAddAudio}
                  >
                    <UploadIcon className="size-4" />
                    添加音频
                  </Button>
                )}
              </div>
            </div>
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
                {Array.from({ length: 12 }, (_, i) => i + 4).map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} 秒</SelectItem>
                ))}
                <SelectItem value="-1">自动</SelectItem>
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
