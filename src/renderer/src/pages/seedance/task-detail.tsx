import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, Loader2Icon, Trash2Icon, FileTextIcon, XIcon } from 'lucide-react'
import { handleApiError } from '@/lib/api-errors'
import VideoPlayer from '@/components/video-player'

interface ContentInfo {
  video_url?: string
  last_frame_url?: string
}

interface TaskDetail {
  id: string
  status: string
  model: string
  created_at: number
  updated_at: number
  content?: ContentInfo
  error?: { code: string; message: string } | null
  duration?: number
  ratio?: string
  resolution?: string
  seed?: number
  framespersecond?: number
  generate_audio?: boolean
  service_tier?: string
  usage?: { completion_tokens: number; total_tokens: number }
}

const STATUS_LABEL: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  expired: '已过期'
}

const STATUS_BADGE: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
}

export default function SeedanceTaskDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [logEntry, setLogEntry] = useState<Record<string, unknown> | null>(null)
  const [taskParams, setTaskParams] = useState<Record<string, unknown> | null>(null)
  const [firstFrameDisplay, setFirstFrameDisplay] = useState<string | null>(null)
  const [lastFrameDisplay, setLastFrameDisplay] = useState<string | null>(null)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [storageDir, setStorageDir] = useState('')
  const [keyframes, setKeyframes] = useState<string[]>([])
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    window.api.file.getDefaultPath().then((dir) => setStorageDir(dir)).catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const fetchTask = useCallback(async (): Promise<void> => {
    if (!id) return
    try {
      const result = await window.api.seedance.getTask(id) as TaskDetail
      setTask(result)

      try {
        const log = await window.api.logs.getTaskLog(id) as Record<string, unknown> | null
        setLogEntry(log)
      } catch {
        // Best-effort
      }

      // Load task params with reference images
      try {
        const params = await window.api.taskParams.getByTaskId(id) as Record<string, unknown> | null
        setTaskParams(params)
        if (params) {
          if (params.first_frame_path && storageDir) {
            const data = await window.api.file.resolveImagePath({ storageDir, relativePath: params.first_frame_path as string })
            setFirstFrameDisplay(data || (params.first_frame_data as string) || null)
          } else {
            setFirstFrameDisplay((params.first_frame_data as string) || null)
          }
          if (params.last_frame_path && storageDir) {
            const data = await window.api.file.resolveImagePath({ storageDir, relativePath: params.last_frame_path as string })
            setLastFrameDisplay(data || (params.last_frame_data as string) || null)
          } else {
            setLastFrameDisplay((params.last_frame_data as string) || null)
          }
        }
      } catch {
        // Task params may not exist yet
      }

      if (result.status === 'succeeded' && result.content?.video_url) {
        const remoteUrl = result.content.video_url
        try {
          const filename = `Seedance_${id}_detail_${Date.now()}`
          const localPath = await window.api.file.downloadVideo({
            url: remoteUrl,
            destDir: storageDir,
            filename
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
          const frames = await window.api.file.readKeyframes({ dir: storageDir, taskId: id })
          const allFrames: string[] = [...(frames.autoFrames.filter(Boolean) as string[]), ...(frames.manualFrames as string[])]
          if (allFrames.length > 0) setKeyframes(allFrames)
        } catch {
          // No keyframes saved yet
        }
      }

      setError('')
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '1.5', '获取任务详情失败')
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

  const handleDelete = async (): Promise<void> => {
    if (!id) return
    setDeleting(true)
    try {
      await window.api.seedance.deleteTask(id)
      navigate('/seedance/tasks')
    } catch (err) {
      console.error('Delete failed:', err)
      setDeleting(false)
    }
  }

  const handleDownload = useCallback(async (): Promise<void> => {
    if (!task?.content?.video_url) return
    try {
      const filename = `Seedance_${task.id}_${Date.now()}`
      await window.api.file.downloadVideo({
        url: task.content.video_url,
        destDir: storageDir,
        filename
      })
    } catch (err) {
      console.error('Download failed:', err)
    }
  }, [task, storageDir])

  const handleKeyframeCapture = useCallback((dataUrl: string): void => {
    setKeyframes((prev) => [...prev, dataUrl])
  }, [])

  const getPrompt = (): string => {
    // Prefer taskParams (dedicated storage, more reliable)
    if (taskParams?.prompt) return taskParams.prompt as string
    // Fall back to operation log
    if (logEntry?.prompt) return logEntry.prompt as string
    if (logEntry?.params) {
      try {
        const rawParams = logEntry.params as string
        const parsed = JSON.parse(rawParams)
        const content = parsed.content || []
        const textItem = content.find((c: { type: string; text?: string }) => c.type === 'text')
        return textItem?.text || ''
      } catch {
        return ''
      }
    }
    return ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="p-6 w-full">
        <button onClick={() => navigate('/seedance/tasks')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
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

  return (
    <div className="p-6 w-full max-w-5xl">
      <button onClick={() => navigate('/seedance/tasks')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeftIcon className="h-4 w-4" /> 返回任务列表
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">任务详情</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{task.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[task.status] || ''}`}>
            {STATUS_LABEL[task.status] || task.status}
          </span>
          {['queued', 'succeeded', 'failed', 'expired'].includes(task.status) && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            >
              <Trash2Icon className="h-4 w-4" />
              {deleting ? '删除中...' : '删除'}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {task.status === 'succeeded' && videoUrl ? (
            <>
              <div className="rounded-lg overflow-hidden bg-black mb-4" style={{ maxHeight: '480px' }}>
                <VideoPlayer
                  videoUrl={videoUrl}
                  taskId={task.id}
                  storageDir={storageDir}
                  onKeyframeCapture={handleKeyframeCapture}
                  onDownload={handleDownload}
                />
              </div>

              {keyframes.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">关键帧</p>
                  <div className="grid grid-cols-4 gap-2">
                    {keyframes.map((dataUrl, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={dataUrl}
                          alt={`关键帧 ${i + 1}`}
                          className="w-full rounded border border-border object-cover aspect-video"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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

          {/* Reference Images */}
          {(firstFrameDisplay || lastFrameDisplay) && (
            <div className="rounded-lg border border-border bg-card p-4 mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">参考图片</p>
              <div className="flex gap-3">
                {firstFrameDisplay && (
                  <div className="relative group cursor-pointer" onClick={() => setZoomImage(firstFrameDisplay)}>
                    <img
                      src={firstFrameDisplay}
                      alt="首帧"
                      className="h-24 w-auto rounded border border-border object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">首帧</span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                      <span className="text-xs text-white">点击放大</span>
                    </div>
                  </div>
                )}
                {lastFrameDisplay && (
                  <div className="relative group cursor-pointer" onClick={() => setZoomImage(lastFrameDisplay)}>
                    <img
                      src={lastFrameDisplay}
                      alt="尾帧"
                      className="h-24 w-auto rounded border border-border object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">尾帧</span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                      <span className="text-xs text-white">点击放大</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {getPrompt() && (
            <div className="rounded-lg border border-border bg-card p-4 mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <FileTextIcon className="h-3.5 w-3.5" />
                提示词
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{getPrompt()}</p>
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">基本信息</p>
            <InfoItem label="模型" value={task.model} />
            <InfoItem label="创建时间" value={task.created_at ? new Date(task.created_at * 1000).toLocaleString('zh-CN') : '-'} />
            <InfoItem label="更新时间" value={task.updated_at ? new Date(task.updated_at * 1000).toLocaleString('zh-CN') : '-'} />
            <InfoItem label="宽高比" value={task.ratio || '-'} />
            <InfoItem label="分辨率" value={task.resolution || '-'} />
            <InfoItem label="时长" value={task.duration ? `${task.duration} 秒` : '-'} />
            <InfoItem label="帧率" value={task.framespersecond ? `${task.framespersecond} fps` : '-'} />
            <InfoItem label="音频" value={task.generate_audio === undefined ? '-' : task.generate_audio ? '有声' : '无声'} />
            <InfoItem label="服务等级" value={task.service_tier || '-'} />
            {task.seed !== undefined && <InfoItem label="种子" value={String(task.seed)} />}
            {task.usage && (
              <InfoItem label="Token 消耗" value={String(task.usage.completion_tokens || task.usage.total_tokens || '-')} />
            )}
          </div>
        </div>
      </div>

      {!isTerminal && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          任务正在处理中，自动刷新中...
        </div>
      )}

      {/* Image zoom modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setZoomImage(null)}
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <img
            src={zoomImage}
            alt="参考图片"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium truncate">{value || '-'}</p>
    </div>
  )
}
