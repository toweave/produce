import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, Loader2Icon, Trash2Icon, XIcon, FileTextIcon, ImageIcon, FilmIcon, AudioLinesIcon } from 'lucide-react'
import { handleApiError } from '@/lib/api-errors'
import { TwoColumnLayout } from '@/components/two-column-layout'
import VideoPlayer from '@/components/video-player'
import { StatusBadge } from './components/status-badge'
import { InfoItem } from './components/info-item'
import type { TaskDetail } from './types'

interface TaskParamsData {
  prompt?: string
  model?: string
  ratio?: string
  resolution?: string
  duration?: number
  generateAudio?: boolean
  watermark?: boolean
  returnLastFrame?: boolean
  webSearch?: boolean
  priority?: number
  references?: {
    images?: Array<{ name: string; relativePath: string | null }>
    videos?: Array<{ name: string; relativePath: string | null; url: string | null }>
    audioFiles?: Array<{ name: string; relativePath: string | null }>
  }
}

export default function Seedance2TaskDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [taskParams, setTaskParams] = useState<TaskParamsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [storageDir, setStorageDir] = useState(() => {
    try {
      return localStorage.getItem('seedance2-storage-current') || ''
    } catch {
      return ''
    }
  })
  const [keyframes, setKeyframes] = useState<string[]>([])
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [refImages, setRefImages] = useState<string[]>([])
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!storageDir) {
      window.api.file.getDefaultPath().then((dir) => setStorageDir(dir)).catch(() => {})
    }
  }, [storageDir])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const fetchTask = useCallback(async () => {
    if (!id) return
    try {
      const result = await window.api.seedance2.getTask(id) as TaskDetail
      setTask(result)

      // Load task params
      try {
        const stored = await window.api.taskParams.getByTaskId(id)
        if (stored) {
          const parsed: TaskParamsData = {
            prompt: stored.prompt || undefined,
            model: stored.model || undefined,
            ratio: stored.ratio || undefined,
            resolution: stored.resolution || undefined,
            duration: stored.duration ?? undefined,
            generateAudio: stored.generate_audio === 1,
            watermark: stored.watermark === 1
          }
          if (stored.full_params) {
            try {
              const fp = JSON.parse(stored.full_params)
              parsed.returnLastFrame = fp.returnLastFrame
              parsed.webSearch = fp.webSearch
              parsed.priority = fp.priority
              parsed.references = fp.references
            } catch { /* ignore */ }
          }
          setTaskParams(parsed)

          // Resolve reference images from stored paths
          if (parsed.references?.images && storageDir) {
            const resolved = await Promise.all(
              parsed.references.images.map(async (img) => {
                if (!img.relativePath) return null
                try {
                  return await window.api.file.resolveImagePath({
                    storageDir,
                    relativePath: img.relativePath
                  }) as string | null
                } catch {
                  return null
                }
              })
            )
            setRefImages(resolved.filter(Boolean) as string[])
          }
        }
      } catch { /* task params may not exist */ }

      if (result.status === 'succeeded' && result.content?.video_url) {
        const remoteUrl = result.content.video_url
        try {
          const localPath = await window.api.file.downloadVideo({
            url: remoteUrl,
            destDir: storageDir,
            filename: `Seedance2_${id}`,
            taskId: id
          })
          const buffer = await window.api.file.readFileBuffer(localPath)
          const blob = new Blob([buffer], { type: 'video/mp4' })
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = URL.createObjectURL(blob)
          setVideoUrl(blobUrlRef.current)
        } catch {
          setVideoUrl(remoteUrl)
        }

        try {
          const frames = await window.api.file.readKeyframes({ dir: storageDir, taskId: id, prefix: 'Seedance2_' })
          const allFrames: string[] = [
            ...(frames.autoFrames.filter(Boolean) as string[]),
            ...(frames.manualFrames as string[])
          ]
          if (allFrames.length > 0) setKeyframes(allFrames)
        } catch {
          /* No keyframes saved yet */
        }
      }

      setError('')
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '2.0', '获取任务详情失败')
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setLoading(false)
    }
  }, [id, storageDir])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  useEffect(() => {
    if (!task || (task.status !== 'queued' && task.status !== 'running')) return
    const timer = setTimeout(fetchTask, 5000)
    return () => clearTimeout(timer)
  }, [task, fetchTask])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await window.api.seedance2.deleteTask(id)
      navigate('/seedance2/tasks')
    } catch {
      setDeleting(false)
    }
  }

  const handleKeyframeCapture = useCallback((dataUrl: string) => {
    setKeyframes((prev) => [...prev, dataUrl])
  }, [])

  const handleDownload = useCallback(async () => {
    if (!task?.content?.video_url) return
    try {
      await window.api.file.downloadVideo({
        url: task.content.video_url,
        destDir: storageDir,
        filename: `Seedance2_${task.id}`,
        taskId: task.id
      })
    } catch { /* fail silently */ }
  }, [task, storageDir])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-6">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="w-full p-6">
        <button
          onClick={() => navigate('/seedance2/tasks')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" /> 返回任务列表
        </button>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error || '任务不存在'}</p>
          {apiKeyMissing && (
            <button
              onClick={() => navigate('/settings/keys')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              前往设置页面配置密钥
            </button>
          )}
        </div>
      </div>
    )
  }

  const isTerminal = ['succeeded', 'failed', 'cancelled', 'expired'].includes(task.status)
  const lastFrameUrl = task.content?.last_frame_url
  const refs = taskParams?.references
  const hasRefVideos = refs?.videos && refs.videos.length > 0
  const hasRefAudio = refs?.audioFiles && refs.audioFiles.length > 0

  return (
    <div className="w-full gap-6">
      <TwoColumnLayout
        leftClassName="w-9/12"
        rightClassName="w-3/12"
        left={
          <div>
            {task.status === 'succeeded' && videoUrl ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-row items-end">
                  <h1 className="text-xl font-bold">任务详情</h1>
                  <p className="ml-4 text-xs font-mono text-muted-foreground mt-0.5">{task.id}</p>
                </div>

                <div className="rounded-lg overflow-hidden bg-black mb-4 w-full max-w-full">
                  <VideoPlayer
                    videoUrl={videoUrl}
                    taskId={task.id}
                    storageDir={storageDir}
                    versionPrefix="Seedance2_"
                    onKeyframeCapture={handleKeyframeCapture}
                    onDownload={handleDownload}
                  />
                </div>

                {keyframes.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-4 mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3">关键帧</p>
                    <div className="grid grid-cols-4 gap-2">
                      {keyframes.map((dataUrl, i) => (
                        <img
                          key={i}
                          src={dataUrl}
                          alt={`关键帧 ${i + 1}`}
                          className="w-full rounded border border-border object-cover aspect-video cursor-pointer"
                          onClick={() => setZoomImage(dataUrl)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : task.status === 'succeeded' && !videoUrl ? (
              <div className="rounded-lg bg-muted/30 p-8 text-center text-muted-foreground">
                <p className="text-sm">视频 URL 已过期或无法加载</p>
              </div>
            ) : task.status === 'failed' ? (
              <div className="rounded-lg bg-destructive/10 p-6 mb-4">
                <p className="text-sm font-medium text-destructive">错误：{task.error?.code}</p>
                <p className="text-sm text-destructive/80 mt-1">{task.error?.message}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/30 p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
                <Loader2Icon className="h-6 w-6 animate-spin" />
                <span className="text-sm">
                  {task.status === 'queued' ? '排队中...' : '正在生成...'}
                </span>
              </div>
            )}

            {/* Reference images from stored params */}
            {refImages.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                  <ImageIcon className="size-3.5" />
                  参考图片
                </p>
                <div className="flex flex-wrap gap-3">
                  {refImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`参考图 ${i + 1}`}
                      className="h-24 w-auto rounded border border-border object-cover cursor-pointer"
                      onClick={() => setZoomImage(src)}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {refs?.images?.map((img, i) => (
                    <span key={i} className="text-xs text-muted-foreground">{img.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Reference videos info */}
            {hasRefVideos && (
              <div className="rounded-lg border border-border bg-card p-4 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <FilmIcon className="size-3.5" />
                  参考视频
                </p>
                <div className="space-y-1">
                  {refs!.videos!.map((v, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">
                      {i + 1}. {v.name}{v.url ? ` (${v.url})` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Reference audio info */}
            {hasRefAudio && (
              <div className="rounded-lg border border-border bg-card p-4 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <AudioLinesIcon className="size-3.5" />
                  参考音频
                </p>
                <div className="space-y-1">
                  {refs!.audioFiles!.map((a, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{i + 1}. {a.name}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt */}
            {taskParams?.prompt && (
              <div className="rounded-lg border border-border bg-card p-4 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <FileTextIcon className="size-3.5" />
                  提示词
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{taskParams.prompt}</p>
              </div>
            )}

            {lastFrameUrl && (
              <div className="rounded-lg border border-border bg-card p-4 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">尾帧图片</p>
                <img
                  src={lastFrameUrl}
                  alt="尾帧"
                  className="max-w-full rounded border border-border object-cover cursor-pointer"
                  style={{ maxHeight: '300px' }}
                  onClick={() => setZoomImage(lastFrameUrl)}
                />
              </div>
            )}
          </div>
        }
        right={
          <div className="flex flex-col gap-4">
            <div className="flex items-center">
              <StatusBadge status={task.status} />
              {['queued', 'succeeded', 'failed', 'expired'].includes(task.status) && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="ml-4 inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                >
                  <Trash2Icon className="h-4 w-4" />
                  {deleting ? '删除中...' : '删除'}
                </button>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">基本信息</p>
              <InfoItem label="模型" value={taskParams?.model || task.model} />
              <InfoItem
                label="创建时间"
                value={task.created_at ? new Date(task.created_at * 1000).toLocaleString('zh-CN') : '-'}
              />
              <InfoItem
                label="更新时间"
                value={task.updated_at ? new Date(task.updated_at * 1000).toLocaleString('zh-CN') : '-'}
              />
              <InfoItem label="宽高比" value={taskParams?.ratio || task.ratio || '-'} />
              <InfoItem label="分辨率" value={taskParams?.resolution || task.resolution || '-'} />
              <InfoItem label="时长" value={taskParams?.duration ? `${taskParams.duration} 秒` : task.duration ? `${task.duration} 秒` : '-'} />
              <InfoItem label="帧率" value={task.framespersecond ? `${task.framespersecond} fps` : '-'} />
              <InfoItem label="音频" value={taskParams?.generateAudio === undefined ? '-' : taskParams.generateAudio ? '有声' : '无声'} />
              <InfoItem label="水印" value={taskParams?.watermark === undefined ? '-' : taskParams.watermark ? '有' : '无'} />
              {taskParams?.returnLastFrame !== undefined && (
                <InfoItem label="返回尾帧" value={taskParams.returnLastFrame ? '是' : '否'} />
              )}
              {taskParams?.webSearch !== undefined && (
                <InfoItem label="联网搜索" value={taskParams.webSearch ? '是' : '否'} />
              )}
              {taskParams?.priority !== undefined && taskParams.priority > 0 && (
                <InfoItem label="优先级" value={String(taskParams.priority)} />
              )}
              <InfoItem label="服务等级" value={task.service_tier || '-'} />
              {task.seed !== undefined && <InfoItem label="种子" value={String(task.seed)} />}
              {task.usage && (
                <InfoItem
                  label="Token 消耗"
                  value={String(task.usage.completion_tokens || task.usage.total_tokens || '-')}
                />
              )}
            </div>
          </div>
        }
      />

      {!isTerminal && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          任务正在处理中，自动刷新中...
        </div>
      )}

      {zoomImage && <ImageZoomModal src={zoomImage} onClose={() => setZoomImage(null)} />}
    </div>
  )
}

function ImageZoomModal({ src, onClose }: { src: string; onClose: () => void }): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="放大查看"
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
