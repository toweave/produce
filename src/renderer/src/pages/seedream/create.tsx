import React, { useState } from 'react'
import { ImageIcon, UploadIcon, XIcon, Loader2Icon, SettingsIcon, SearchIcon } from 'lucide-react'
import { handleApiError } from '@/lib/api-errors'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type Resolution = '2K' | '3K' | '4K'
type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9'
type OutputFormat = 'png' | 'jpeg'

const RESOLUTION_SIZE: Record<Resolution, Record<AspectRatio, string>> = {
  '2K': { '1:1': '2048x2048', '4:3': '2304x1728', '3:4': '1728x2304', '16:9': '2848x1600', '9:16': '1600x2848', '3:2': '2496x1664', '2:3': '1664x2496', '21:9': '3136x1344' },
  '3K': { '1:1': '3072x3072', '4:3': '3456x2592', '3:4': '2592x3456', '16:9': '4096x2304', '9:16': '2304x4096', '3:2': '3744x2496', '2:3': '2496x3744', '21:9': '4704x2016' },
  '4K': { '1:1': '4096x4096', '4:3': '4704x3520', '3:4': '3520x4704', '16:9': '5504x3040', '9:16': '3040x5504', '3:2': '4992x3328', '2:3': '3328x4992', '21:9': '6240x2656' }
}

const ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9']

const IMAGE_FILTERS: Electron.FileFilter[] = [
  { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'heic', 'heif'] }
]

interface MediaItem {
  id: string
  dataUri: string
  name: string
}

interface GeneratedImage {
  url?: string
  b64_json?: string
  size?: string
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default function SeedreamCreatePage(): React.JSX.Element {
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
  const [results, setResults] = useState<GeneratedImage[]>([])
  const [usage, setUsage] = useState<{ generated_images: number; output_tokens: number } | null>(null)

  const maxRefImages = 14
  const maxGroupImages = 15 - images.length

  const handleAddImage = async (): Promise<void> => {
    if (images.length >= maxRefImages) return
    const filePath = await window.api.dialog.openFile(IMAGE_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'image'
    setImages((prev) => [...prev, { id: generateId(), dataUri, name }])
  }

  const handleRemoveImage = (id: string): void => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }
    setSubmitting(true)
    setError('')
    setApiKeyMissing(false)
    setResults([])
    setUsage(null)
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
      const result = await window.api.seedream.generateImage(params) as {
        data?: GeneratedImage[]
        usage?: { generated_images: number; output_tokens: number }
      }
      if (result.data) {
        setResults(result.data)
      }
      if (result.usage) {
        setUsage(result.usage)
      }
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '5.0', '图片生成失败')
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="size-6" />
          图片创作
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          使用 Seedream 5.0 lite 模型，支持文生图、图文生图、多图融合和组图生成
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
          <p>{error}</p>
          {apiKeyMissing && (
            <a href="/settings/keys" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <SettingsIcon className="size-3" />
              前往设置页面配置密钥
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Area */}
        <div className="flex flex-col gap-4">
          {/* Prompt */}
          <Field orientation="vertical">
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
              <button
                onClick={handleAddImage}
                disabled={images.length >= maxRefImages}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                <UploadIcon className="size-3" />
                上传图片
              </button>
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

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !prompt.trim()}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
                生成中...
              </>
            ) : (
              <>
                <ImageIcon className="size-4" data-icon="inline-start" />
                生成图片
              </>
            )}
          </button>
        </div>

        {/* Right: Result Area */}
        <div>
          <div className="rounded-lg border border-border bg-card p-4 h-full flex flex-col gap-3">
            <h3 className="text-sm font-medium">生成结果</h3>
            {submitting ? (
              <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className={cn(
                  'grid gap-3',
                  results.length === 1 && 'grid-cols-1',
                  results.length === 2 && 'grid-cols-2',
                  results.length > 2 && 'grid-cols-2 lg:grid-cols-3'
                )}>
                  {results.map((img, idx) => (
                    <div key={idx} className="rounded-md border border-border overflow-hidden bg-muted">
                      <img
                        src={img.url || (img.b64_json ? `data:image/${outputFormat};base64,${img.b64_json}` : '')}
                        alt={`生成图片 ${idx + 1}`}
                        className="w-full h-auto object-cover"
                      />
                      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50">
                        <span className="text-xs text-muted-foreground">
                          {img.size || `${idx + 1}`}
                        </span>
                        {img.url && (
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            下载
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {usage && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                    <Separator className="mb-2" />
                    <Badge variant="secondary">生成 {usage.generated_images} 张</Badge>
                    <Badge variant="outline">Token: {usage.output_tokens}</Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                输入提示词并点击生成按钮
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
