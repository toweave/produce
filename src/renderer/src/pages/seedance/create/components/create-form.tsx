import React from 'react'
import { VideoIcon, UploadIcon, XIcon, Loader2Icon, SettingsIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'

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

const RATIO_OPTIONS = [
  { value: 'adaptive' as const, label: '自适应' },
  { value: '16:9' as const, label: '16:9' },
  { value: '4:3' as const, label: '4:3' },
  { value: '1:1' as const, label: '1:1' },
  { value: '3:4' as const, label: '3:4' },
  { value: '9:16' as const, label: '9:16' },
  { value: '21:9' as const, label: '21:9' }
]

const DURATION_OPTIONS = [
  { value: -1, label: '自动' },
  ...Array.from({ length: 12 }, (_, i) => i + 3).map((d) => ({
    value: d,
    label: `${d} 秒`
  }))
]

const RESOLUTION_OPTIONS = [
  { value: '480p' as const, label: '480p' },
  { value: '720p' as const, label: '720p' },
  { value: '1080p' as const, label: '1080p' }
]

const AUDIO_OPTIONS = [
  { value: true, label: '生成音频' },
  { value: false, label: '无声' }
]

interface CreateFormProps {
  onSubmit: () => void
}

export function CreateForm({ onSubmit }: CreateFormProps): React.JSX.Element {
  const navigate = useNavigate()
  const {
    prompt,
    imageData,
    useLastFrame,
    lastFrameData,
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
    setPrompt,
    clearImage,
    selectImage,
    selectLastFrame,
    setUseLastFrame,
    setRatio,
    setDuration,
    setResolution,
    setGenerateAudio,
    setWatermark,
    handleStorageChange
  } = useSeedanceCreateStore()

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

      {/* Reference Image */}
      <FieldGroup>
        <Field>
          <FieldLabel>参考图片（可选）</FieldLabel>
          <FieldContent>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="useLastFrame"
                checked={useLastFrame}
                onCheckedChange={(checked) => setUseLastFrame(!!checked)}
              />
              <Label htmlFor="useLastFrame" className="text-xs cursor-pointer">
                使用首尾帧
              </Label>
            </div>
            <div className="flex gap-3">
              <div
                onClick={selectImage}
                className="relative flex flex-col items-center justify-center size-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
              >
                {imageData ? (
                  <>
                    <img
                      src={imageData}
                      alt="首帧"
                      className="size-full object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearImage()
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <UploadIcon className="size-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">
                      选择首帧图
                    </span>
                  </>
                )}
              </div>
              {useLastFrame && (
                <div
                  onClick={selectLastFrame}
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
                      <span className="text-xs text-muted-foreground">
                        选择尾帧图
                      </span>
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
            <Select value={ratio} onValueChange={(v) => setRatio(v as typeof ratio)}>
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
            <Select
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v))}
            >
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
            <Select
              value={resolution}
              onValueChange={(v) => setResolution(v as typeof resolution)}
            >
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
              onValueChange={(v) => setGenerateAudio(v === 'true')}
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
            onCheckedChange={(checked) => setWatermark(!!checked)}
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
            <Select value={currentDir} onValueChange={handleStorageChange}>
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
          <Button
            variant="outline"
            onClick={() => navigate(`/seedance/tasks/${createdId}`)}
          >
            查看详情
          </Button>
        )}
      </div>
    </div>
  )
}
