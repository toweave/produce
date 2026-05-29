import React, { useState, useCallback } from 'react'
import { ImageIcon, UploadIcon, XIcon, SearchIcon, SettingsIcon, Loader2Icon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

import type { Resolution, AspectRatio, OutputFormat, MediaItem } from '../../types'
import { RESOLUTION_SIZE, ASPECT_RATIOS } from '../../constants'
import { handleApiError } from '@/lib/api-errors'

const IMAGE_FILTERS: Electron.FileFilter[] = [
  { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'heic', 'heif'] }
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export interface CreateFormMeta {
  prompt: string
  resolution: Resolution
  aspectRatio: AspectRatio
  outputFormat: OutputFormat
  groupMode: boolean
  maxImages: number
  webSearch: boolean
  watermark: boolean
  images: MediaItem[]
}

interface CreateFormProps {
  onSubmit: (apiParams: Record<string, unknown>, meta: CreateFormMeta) => Promise<void>
}

export function CreateForm({ onSubmit }: CreateFormProps): React.JSX.Element {
  const navigate = useNavigate()

  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<MediaItem[]>([])
  const [resolution, setResolution] = useState<Resolution>('2K')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png')
  const [groupMode, setGroupMode] = useState(false)
  const [maxImages, setMaxImages] = useState(4)
  const [webSearch, setWebSearch] = useState(false)
  const [watermark, setWatermark] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  const maxRefImages = 14
  const maxGroupImages = 15 - images.length

  const handleAddImage = useCallback(async (): Promise<void> => {
    if (images.length >= maxRefImages) return
    const filePath = await window.api.dialog.openFile(IMAGE_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'image'
    setImages((prev) => [...prev, { id: generateId(), dataUri, name }])
  }, [images.length])

  const handleRemoveImage = useCallback((id: string): void => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }

    setSubmitting(true)
    setError('')
    setApiKeyMissing(false)

    try {
      const size = RESOLUTION_SIZE[resolution][aspectRatio]
      const params: Record<string, unknown> = {
        model: 'doubao-seedream-5-0-260128',
        prompt: prompt.trim(),
        size,
        output_format: outputFormat,
        response_format: 'url',
        watermark
      }
      if (images.length === 1) {
        params.image = images[0].dataUri
      } else if (images.length > 1) {
        params.image = images.map((img) => img.dataUri)
      }
      if (groupMode) {
        params.sequential_image_generation = 'auto'
        params.sequential_image_generation_options = { max_images: maxImages }
      } else {
        params.sequential_image_generation = 'disabled'
      }
      if (webSearch) {
        params.tools = [{ type: 'web_search' }]
      }

      const meta: CreateFormMeta = {
        prompt: prompt.trim(),
        resolution,
        aspectRatio,
        outputFormat,
        groupMode,
        maxImages,
        webSearch,
        watermark,
        images
      }

      await onSubmit(params, meta)
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '5.0', '图片生成失败')
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt */}
      <Field orientation="vertical">
        <FieldLabel>提示词</FieldLabel>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的图片内容，例如：一只可爱的橘猫坐在窗台上，阳光洒在它身上，温馨的室内场景"
          rows={4}
        />
        <FieldDescription>
          建议不超过 300 个汉字或 600 个英文单词
        </FieldDescription>
      </Field>

      {/* Reference Images */}
      <Field orientation="vertical">
        <div className="flex items-center justify-between">
          <FieldLabel>参考图片（{images.length}/{maxRefImages}）</FieldLabel>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddImage}
            disabled={images.length >= maxRefImages}
          >
            <UploadIcon className="size-3" />
            上传图片
          </Button>
        </div>
        {images.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-md border border-border overflow-hidden aspect-square bg-muted">
                <img src={img.dataUri} alt={img.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="size-3" />
                </button>
                <p className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 py-0.5 text-[10px] text-white">
                  {img.name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
            上传参考图片进行图文生图或多图融合（可选）
          </p>
        )}
      </Field>

      <Separator />

      {/* Resolution */}
      <Field orientation="vertical">
        <FieldLabel>分辨率</FieldLabel>
        <ToggleGroup
          type="single"
          value={resolution}
          onValueChange={(v) => v && setResolution(v as Resolution)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="2K">2K</ToggleGroupItem>
          <ToggleGroupItem value="3K">3K</ToggleGroupItem>
          <ToggleGroupItem value="4K">4K</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      {/* Aspect Ratio */}
      <Field orientation="vertical">
        <FieldLabel>宽高比</FieldLabel>
        <ToggleGroup
          type="single"
          value={aspectRatio}
          onValueChange={(v) => v && setAspectRatio(v as AspectRatio)}
          variant="outline"
          size="sm"
        >
          {ASPECT_RATIOS.map((r) => (
            <ToggleGroupItem key={r} value={r}>{r}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>
          输出尺寸: {RESOLUTION_SIZE[resolution][aspectRatio]}
        </FieldDescription>
      </Field>

      {/* Output Format */}
      <Field orientation="vertical">
        <FieldLabel>输出格式</FieldLabel>
        <ToggleGroup
          type="single"
          value={outputFormat}
          onValueChange={(v) => v && setOutputFormat(v as OutputFormat)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="png">PNG</ToggleGroupItem>
          <ToggleGroupItem value="jpeg">JPEG</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Separator />

      {/* Group Mode */}
      <Field orientation="horizontal">
        <div className="flex flex-col">
          <FieldLabel>组图模式</FieldLabel>
          <FieldDescription>生成一组内容关联的图片</FieldDescription>
          {groupMode && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground">生成张数:</span>
              <input
                type="number"
                min={1}
                max={maxGroupImages}
                value={maxImages}
                onChange={(e) => setMaxImages(Math.max(1, Math.min(maxGroupImages, parseInt(e.target.value) || 1)))}
                className="w-16 rounded-md border border-input bg-background px-2 py-1 text-xs text-center"
              />
              <span className="text-xs text-muted-foreground">（最多 {maxGroupImages} 张）</span>
            </div>
          )}
        </div>
        <Switch checked={groupMode} onCheckedChange={setGroupMode} size="sm" />
      </Field>

      {/* Web Search */}
      <Field orientation="horizontal">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <SearchIcon className="size-3.5 text-muted-foreground" />
            <FieldLabel>联网搜索</FieldLabel>
          </div>
          <FieldDescription>获取实时信息提升生成时效性</FieldDescription>
        </div>
        <Switch checked={webSearch} onCheckedChange={setWebSearch} size="sm" />
      </Field>

      {/* Watermark */}
      <Field orientation="horizontal">
        <div className="flex flex-col">
          <FieldLabel>水印</FieldLabel>
          <FieldDescription>在图片右下角添加"AI生成"标识</FieldDescription>
        </div>
        <Switch checked={watermark} onCheckedChange={setWatermark} size="sm" />
      </Field>

      <Separator />

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

      <Button
        onClick={handleSubmit}
        disabled={submitting || !prompt.trim()}
        size="lg"
        className="w-full"
      >
        {submitting ? (
          <><Loader2Icon data-icon="inline-start" className="animate-spin" />生成中...</>
        ) : (
          <><ImageIcon data-icon="inline-start" />生成图片</>
        )}
      </Button>
    </div>
  )
}
