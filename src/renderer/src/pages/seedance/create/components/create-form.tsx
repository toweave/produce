import { VideoIcon, UploadIcon, XIcon, Loader2Icon, SettingsIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Ratio, Resolution } from '../types'

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
  onStorageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
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
    <div className="space-y-4 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <VideoIcon className="h-6 w-6" />
          视频创作
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          使用 Doubao-Seedance-1.5-Pro 模型生成视频
        </p>
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium mb-1.5">提示词</label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="描述你想要生成的视频内容，例如：写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近..."
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-1">中文不超过 500 字，英文不超过 1000 词</p>
      </div>

      {/* Reference Image */}
      <div>
        <label className="block text-sm font-medium mb-1.5">参考图片（可选）</label>
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={useLastFrame}
              onChange={(e) => onUseLastFrameChange(e.target.checked)}
              className="rounded border-gray-300"
            />
            使用首尾帧
          </label>
        </div>
        <div className="flex gap-3">
          <div
            onClick={onSelectImage}
            className="relative flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
          >
            {imageData ? (
              <>
                <img src={imageData} alt="首帧" className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={(e) => { e.stopPropagation(); onClearImage() }}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <UploadIcon className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">选择首帧图</span>
              </>
            )}
          </div>
          {useLastFrame && (
            <div
              onClick={onSelectLastFrame}
              className="relative flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
            >
              {lastFrameData ? (
                <img src={lastFrameData} alt="尾帧" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <>
                  <UploadIcon className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">选择尾帧图</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">宽高比</label>
          <select
            value={ratio}
            onChange={(e) => onRatioChange(e.target.value as Ratio)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="adaptive">自适应</option>
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
            <option value="3:4">3:4</option>
            <option value="9:16">9:16</option>
            <option value="21:9">21:9</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">时长</label>
          <select
            value={duration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 9 }, (_, i) => i + 4).map((d) => (
              <option key={d} value={d}>{d} 秒</option>
            ))}
            <option value={-1}>自动</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">分辨率</label>
          <select
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value as Resolution)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">音频</label>
          <select
            value={generateAudio ? 'true' : 'false'}
            onChange={(e) => onGenerateAudioChange(e.target.value === 'true')}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="true">生成音频</option>
            <option value="false">无声</option>
          </select>
        </div>
      </div>

      {/* Watermark */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="watermark"
          checked={watermark}
          onChange={(e) => onWatermarkChange(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="watermark" className="text-sm">添加水印</label>
      </div>

      {/* Storage Location */}
      <div>
        <label className="block text-sm font-medium mb-1.5">存储位置</label>
        <select
          value={currentDir}
          onChange={onStorageChange}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm truncate"
        >
          {storageDirs.map((dir) => (
            <option key={dir} value={dir}>{dir}</option>
          ))}
          <option value="__add__">+ 添加目录...</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1 truncate">{currentDir}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          {apiKeyMissing && (
            <button
              onClick={() => navigate('/settings/keys')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <SettingsIcon className="h-3 w-3" />
              前往设置页面配置密钥
            </button>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <VideoIcon className="mr-2 h-4 w-4" />
              生成视频
            </>
          )}
        </button>
        {createdId && (
          <button
            onClick={() => navigate(`/seedance/tasks/${createdId}`)}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            查看详情
          </button>
        )}
      </div>
    </div>
  )
}
