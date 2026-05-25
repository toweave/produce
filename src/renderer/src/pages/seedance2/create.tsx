import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoIcon, UploadIcon, XIcon, Loader2Icon, ImageIcon, FilmIcon, AudioLinesIcon, SettingsIcon } from 'lucide-react'
import { handleApiError } from '@/lib/api-errors'

type ModelId = 'doubao-seedance-2-0-260128' | 'doubao-seedance-2-0-fast-260128'
type Ratio = 'adaptive' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9'
type Resolution = '480p' | '720p' | '1080p'

interface MediaItem {
  id: string
  dataUri?: string
  name: string
}

const MODELS: { value: ModelId; label: string }[] = [
  { value: 'doubao-seedance-2-0-260128', label: 'Doubao-Seedance-2.0' },
  { value: 'doubao-seedance-2-0-fast-260128', label: 'Doubao-Seedance-2.0-Fast' }
]

const IMAGE_FILTERS: Electron.FileFilter[] = [
  { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'heic', 'heif'] }
]

const AUDIO_FILTERS: Electron.FileFilter[] = [
  { name: '音频', extensions: ['mp3', 'wav'] }
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default function Seedance2CreatePage(): React.JSX.Element {
  const navigate = useNavigate()
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [createdId, setCreatedId] = useState('')

  const isFast = model === 'doubao-seedance-2-0-fast-260128'
  const hasMedia = images.length > 0 || videos.length > 0 || audioFiles.length > 0

  const handleAddImage = async (): Promise<void> => {
    if (images.length >= 9) return
    const filePath = await window.api.dialog.openFile(IMAGE_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'image'
    setImages([...images, { id: generateId(), dataUri, name }])
  }

  const handleRemoveImage = (id: string): void => {
    setImages(images.filter((i) => i.id !== id))
  }

  const handleAddAudio = async (): Promise<void> => {
    if (audioFiles.length >= 3) return
    const filePath = await window.api.dialog.openFile(AUDIO_FILTERS)
    if (!filePath) return
    const dataUri = await window.api.file.readBase64(filePath)
    const name = filePath.split(/[/\\]/).pop() || 'audio'
    setAudioFiles([...audioFiles, { id: generateId(), dataUri, name }])
  }

  const handleRemoveAudio = (id: string): void => {
    setAudioFiles(audioFiles.filter((a) => a.id !== id))
  }

  const handleSubmit = async (): Promise<void> => {
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

      const result = await window.api.seedance2.createTask(params) as { id: string }
      setCreatedId(result.id)
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '2.0', '创建任务失败')
      setError(message)
      setApiKeyMissing(isMissing)
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
            onClick={() => navigate(`/seedance2/tasks/${createdId}`)}
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
          使用 Doubao-Seedance-2.0 系列模型生成视频
        </p>
      </div>

      <div className="space-y-6">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium mb-1.5">模型</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelId)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

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

        {/* Multi-modal Reference */}
        <div className="space-y-4">
          {/* Images */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              参考图片（{images.length}/9，可选）
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative w-24 h-24 rounded-lg border border-border overflow-hidden">
                  <img src={img.dataUri} alt={img.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 9 && (
                <div
                  onClick={handleAddImage}
                  className="flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <ImageIcon className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">添加图片</span>
                </div>
              )}
            </div>
          </div>

          {/* Videos */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              参考视频（{videos.length}/3，可选，需使用公网 URL）
            </label>
            <div className="space-y-2">
              {videos.map((v, i) => (
                <div key={v.id} className="flex items-center gap-2">
                  <input
                    value={v.dataUri || ''}
                    onChange={(e) => {
                      const next = [...videos]
                      next[i] = { ...next[i], dataUri: e.target.value }
                      setVideos(next)
                    }}
                    placeholder="输入视频公网 URL"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => setVideos(videos.filter((x) => x.id !== v.id))}
                    className="rounded p-1 hover:bg-accent text-destructive"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {videos.length < 3 && (
                <button
                  onClick={() => setVideos([...videos, { id: generateId(), name: `video ${videos.length + 1}`, dataUri: '' }])}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <FilmIcon className="h-4 w-4" />
                  添加视频 URL
                </button>
              )}
            </div>
          </div>

          {/* Audio */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              参考音频（{audioFiles.length}/3，可选）
            </label>
            <div className="flex flex-wrap gap-2">
              {audioFiles.map((a) => (
                <div key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                  <AudioLinesIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[160px]">{a.name}</span>
                  <button onClick={() => handleRemoveAudio(a.id)} className="text-destructive hover:text-destructive/80">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {audioFiles.length < 3 && (
                <button
                  onClick={handleAddAudio}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <UploadIcon className="h-4 w-4" />
                  添加音频
                </button>
              )}
            </div>
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
              {Array.from({ length: 12 }, (_, i) => i + 4).map((d) => (
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
              {!isFast && <option value="1080p">1080p</option>}
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

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
              className="rounded border-gray-300"
            />
            添加水印
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={returnLastFrame}
              onChange={(e) => setReturnLastFrame(e.target.checked)}
              className="rounded border-gray-300"
            />
            返回尾帧图片
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={webSearch}
              onChange={(e) => setWebSearch(e.target.checked)}
              disabled={hasMedia}
              className="rounded border-gray-300"
            />
            联网搜索
            {hasMedia && <span className="text-xs text-muted-foreground">（仅纯文本模式可用）</span>}
          </label>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            优先级（0-9，越大越优先）
          </label>
          <input
            type="number"
            min={0}
            max={9}
            value={priority}
            onChange={(e) => setPriority(Math.min(9, Math.max(0, Number(e.target.value))))}
            className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
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
