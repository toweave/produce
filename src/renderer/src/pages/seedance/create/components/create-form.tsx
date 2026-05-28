import { VideoIcon, UploadIcon, XIcon, Loader2Icon, SettingsIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Ratio, Resolution } from '@/pages/seedance/types'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

const RATIO_OPTIONS: { value: Ratio; label: string }[] = [
  { value: 'adaptive', label: '自适应' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '9:16', label: '9:16' },
  { value: '21:9', label: '21:9' },
]

const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: -1, label: '自动' },
  ...Array.from({ length: 12 }, (_, i) => i + 3).map((d) => ({
    value: d,
    label: `${d} 秒`,
  })),
]

const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
]

const AUDIO_OPTIONS: { value: boolean; label: string }[] = [
  { value: true, label: '生成音频' },
  { value: false, label: '无声' },
]

interface CreateFormProps {
  prompt: string
  imageData: string | null
  lastFrameData: string | null
  useLastFrame: boolean
  ratio: Ratio
  duration: number
  resolution: Resolution
  generateAudio: boolean
  watermark: boolean
  error: string
  apiKeyMissing: boolean
  submitting: boolean
  createdId: string
  storageDirs: string[]
  currentDir: string
  onPromptChange: (value: string) => void
  onSelectImage: () => void
  onClearImage: () => void
  onSelectLastFrame: () => void
  onUseLastFrameChange: (value: boolean) => void
  onRatioChange: (value: Ratio) => void
  onDurationChange: (value: number) => void
  onResolutionChange: (value: Resolution) => void
  onGenerateAudioChange: (value: boolean) => void
  onWatermarkChange: (value: boolean) => void
  onStorageChange: (value: string) => void
  onSubmit: () => void
}

export function CreateForm({
  prompt,
  imageData,
  lastFrameData,
  useLastFrame,
  ratio,
  duration,
  resolution,
  generateAudio,
  watermark,
  error,
  apiKeyMissing,
  submitting,
  createdId,
  storageDirs,
  currentDir,
  onPromptChange,
  onSelectImage,
  onClearImage,
  onSelectLastFrame,
  onUseLastFrameChange,
  onRatioChange,
  onDurationChange,
  onResolutionChange,
  onGenerateAudioChange,
  onWatermarkChange,
  onStorageChange,
  onSubmit
}: CreateFormProps): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <VideoIcon className="size-6" />
          视频创作
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          使用 Doubao-Seedance-1.5-Pro 模型生成视频
        </p>
      </div>

      {/* Prompt */}
      <FieldGroup>
        <Field>
          <FieldLabel>提示词</FieldLabel>
          <FieldContent>
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="描述你想要生成的视频内容，例如：写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近..."
              rows={4}
            />
            <FieldDescription>中文不超过 500 字，英文不超过 1000 词</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      {/* Reference Image */}
      <FieldGroup>
        <Field>
          <FieldLabel>参考图片（可选）</FieldLabel>
          <FieldContent>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="useLastFrame"
                checked={useLastFrame}
                onCheckedChange={(checked) => onUseLastFrameChange(!!checked)}
              />
              <Label htmlFor="useLastFrame" className="text-xs cursor-pointer">
                使用首尾帧
              </Label>
            </div>
            <div className="flex gap-3">
              <div
                onClick={onSelectImage}
                className="relative flex flex-col items-center justify-center size-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
              >
                {imageData ? (
                  <>
                    <img src={imageData} alt="首帧" className="size-full object-cover rounded-lg" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onClearImage()
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <UploadIcon className="size-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">选择首帧图</span>
                  </>
                )}
              </div>
              {useLastFrame && (
                <div
                  onClick={onSelectLastFrame}
                  className="relative flex flex-col items-center justify-center size-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {lastFrameData ? (
                    <img
                      className="size-full object-cover rounded-lg"
                      src={lastFrameData}
                      alt="尾帧"
                    />
                  ) : (
                    <>
                      <UploadIcon className="size-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">选择尾帧图</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </FieldContent>
        </Field>
      </FieldGroup>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>宽高比</FieldLabel>
          <FieldContent>
            <Select value={ratio} onValueChange={(v) => onRatioChange(v as Ratio)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATIO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>时长</FieldLabel>
          <FieldContent>
            <Select value={String(duration)} onValueChange={(v) => onDurationChange(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>分辨率</FieldLabel>
          <FieldContent>
            <Select value={resolution} onValueChange={(v) => onResolutionChange(v as Resolution)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
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
              onValueChange={(v) => onGenerateAudioChange(v === 'true')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIO_OPTIONS.map((opt) => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      </div>

      {/* Watermark */}
      <FieldGroup>
        <Field orientation="horizontal" className="gap-2">
          <Checkbox
            id="watermark"
            checked={watermark}
            onCheckedChange={(checked) => onWatermarkChange(!!checked)}
          />
          <Label htmlFor="watermark" className="text-sm cursor-pointer">
            添加水印
          </Label>
        </Field>
      </FieldGroup>

      {/* Storage Location */}
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

      {/* Error */}
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

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <VideoIcon data-icon="inline-start" />
              生成视频
            </>
          )}
        </Button>
        {createdId && (
          <Button variant="outline" onClick={() => navigate(`/seedance/tasks/${createdId}`)}>
            查看详情
          </Button>
        )}
      </div>
    </div>
  )
}
