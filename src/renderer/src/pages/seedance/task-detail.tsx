import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, Loader2Icon, Trash2Icon, ExternalLinkIcon, SettingsIcon } from 'lucide-react'
import { handleApiError } from '@/lib/api-errors'

interface TaskDetail {
  id: string
  status: string
  model: string
  created_at: number
  updated_at: number
  content?: {
    video_url?: string
    last_frame_url?: string
  }
  error?: { code: string; message: string } | null
  duration?: number
  ratio?: string
  resolution?: string
  seed?: number
  framespersecond?: number
  generate_audio?: boolean
  service_tier?: string
  usage?: {
    completion_tokens: number
    total_tokens: number
  }
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchTask = useCallback(async (): Promise<void> => {
    if (!id) return
    try {
      const result = await window.api.seedance.getTask(id) as TaskDetail
      setTask(result)
      setError('')
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '1.5', '获取任务详情失败')
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  // Auto-poll while task is queued or running
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
              <SettingsIcon className="h-3 w-3" />
              前往设置页面配置密钥
            </button>
          )}
        </div>
      </div>
    )
  }

  const isTerminal = ['succeeded', 'failed', 'cancelled', 'expired'].includes(task.status)

  return (
    <div className="p-6 w-full">
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
          {(task.status === 'queued' || task.status === 'succeeded' || task.status === 'failed' || task.status === 'expired') && (
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

      {/* Video player */}
      {task.status === 'succeeded' && task.content?.video_url && (
        <div className="rounded-lg overflow-hidden bg-black mb-6">
          <video
            src={task.content.video_url}
            controls
            autoPlay
            className="w-full max-h-[500px]"
            poster={task.content.last_frame_url || undefined}
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      )}

      {/* Error */}
      {task.status === 'failed' && task.error && (
        <div className="rounded-md bg-destructive/10 p-4 mb-6">
          <p className="text-sm font-medium text-destructive">错误：{task.error.code}</p>
          <p className="text-sm text-destructive/80 mt-1">{task.error.message}</p>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

      {/* Actions for succeeded */}
      {task.status === 'succeeded' && task.content?.video_url && (
        <div className="mt-6 flex gap-3">
          <a
            href={task.content.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            下载视频
          </a>
        </div>
      )}

      {/* Polling hint */}
      {!isTerminal && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          任务正在处理中，自动刷新中...
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  )
}
