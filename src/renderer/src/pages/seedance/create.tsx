import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoIcon, UploadIcon, XIcon, Loader2Icon } from 'lucide-react'

type Ratio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive'
type Resolution = '480p' | '720p' | '1080p'

export default function SeedanceCreatePage(): React.JSX.Element {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [useLastFrame, setUseLastFrame] = useState(false)
  const [lastFrameData, setLastFrameData] = useState<string | null>(null)
  const [ratio, setRatio] = useState<Ratio>('adaptive')
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState<Resolution>('720p')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [watermark, setWatermark] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState('')

  const handleSelectImage = async (): Promise<void> => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    setImageData(base64)
  }

  const handleSelectLastFrame = async (): Promise<void> => {
    const filePath = await window.api.dialog.openFile()
    if (!filePath) return
    const base64 = await window.api.file.readBase64(filePath)
    setLastFrameData(base64)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('请输入视频提示词')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const content: { type: string; text?: string; image_url?: { url: string }; role?: string }[] = [
        { type: 'text', text: prompt.trim() }
      ]

      if (imageData && useLastFrame && lastFrameData) {
        content.push({ type: 'image_url', image_url: { url: imageData }, role: 'first_frame' })
        content.push({ type: 'image_url', image_url: { url: lastFrameData }, role: 'last_frame' })
      } else if (imageData) {
        content.push({ type: 'image_url', image_url: { url: imageData } })
      }

      const params: Record<string, unknown> = {
        model: 'doubao-seedance-1-5-pro-251215',
        content,
        ratio,
        duration,
        resolution,
        generate_audio: generateAudio,
        watermark
      }

      const result = await window.api.seedance.createTask(params) as { id: string }
      setCreatedId(result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (createdId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <VideoIcon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">任务已创建</h2>
        <p className="text-sm text-muted-foreground">任务 ID：{createdId}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/seedance/tasks/${createdId}`)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            查看任务详情
          </button>
          <button
            onClick={() => setCreatedId('')}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            继续创作
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <VideoIcon className="h-6 w-6" />
          视频创作
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          使用 Doubao-Seedance-1.5-Pro 模型生成视频
        </p>
      </div>

      <div className="space-y-6">
        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium mb-1.5">提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的视频内容，例如：写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            中文不超过 500 字，英文不超过 1000 词
          </p>
        </div>

        {/* Reference Image */}
        <div>
          <label className="block text-sm font-medium mb-1.5">参考图片（可选）</label>
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={useLastFrame}
                onChange={(e) => setUseLastFrame(e.target.checked)}
                className="rounded border-gray-300"
              />
              使用首尾帧
            </label>
          </div>
          <div className="flex gap-3">
            <div
              onClick={handleSelectImage}
              className="flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
            >
              {imageData ? (
                <>
                  <img src={imageData} alt="首帧" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageData(null) }}
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
                onClick={handleSelectLastFrame}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">宽高比</label>
            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value as Ratio)}
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
              onChange={(e) => setDuration(Number(e.target.value))}
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
              onChange={(e) => setResolution(e.target.value as Resolution)}
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
              onChange={(e) => setGenerateAudio(e.target.value === 'true')}
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
            onChange={(e) => setWatermark(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="watermark" className="text-sm">添加水印</label>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  )
}
