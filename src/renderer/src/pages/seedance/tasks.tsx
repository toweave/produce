import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListTodoIcon, RefreshCwIcon, Trash2Icon, EyeIcon, Loader2Icon, SettingsIcon, ChevronRightIcon, FileTextIcon } from 'lucide-react'
import { handleApiError } from '@/lib/api-errors'
import { TwoColumnLayout } from '@/components/two-column-layout'
import VideoPlayer from '@/components/video-player'
import { STATUS_OPTIONS, STATUS_LABEL } from './constants'
import { StatusBadge } from './components/status-badge'
import { InfoRow } from './components/info-item'
import type { TaskItem, TaskDetail } from './types'

export default function SeedanceTasksPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const pageSize = 20

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { preview, selectTask } = useTaskPreview()

  useEffect(() => {
    if (!selectedId) selectTask(null)
  }, [selectedId])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    setApiKeyMissing(false)
    try {
      const params = new URLSearchParams()
      params.set('page_size', String(pageSize))
      params.set('page_num', String(page))
      if (statusFilter) params.set('filter.status', statusFilter)
      const result = (await window.api.seedance.listTasks(`?${params.toString()}`)) as {
        items?: TaskItem[]
        total?: number
      }
      setTasks(result.items || [])
      setTotal(result.total || 0)
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '1.5', '获取任务列表失败')
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleSelectTask = async (task: TaskItem) => {
    setSelectedId(task.id)
    await selectTask(task)
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.seedance.deleteTask(id)
      if (selectedId === id) setSelectedId(null)
      fetchTasks()
    } catch {
      /* fail silently */
    }
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    setSelectedId(null)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <TwoColumnLayout
      leftClassName="w-2/3"
      rightClassName="w-1/3"
      left={
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListTodoIcon className="h-6 w-6" />
              任务列表
            </h1>
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFilterChange(opt.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
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

          <div className="rounded-md border border-border overflow-hidden flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                    任务 ID
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">模型</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                    创建时间
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10">
                      <Loader2Icon className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      暂无任务
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                        selectedId === task.id
                          ? 'bg-primary/10 hover:bg-primary/15'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/seedance/tasks/${task.id}`)
                          }}
                          className="font-mono text-xs truncate max-w-[200px] block hover:text-primary transition-colors text-left"
                          title="点击查看详情"
                        >
                          {task.id}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs">{task.model}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {task.created_at
                          ? new Date(task.created_at * 1000).toLocaleString('zh-CN')
                          : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/seedance/tasks/${task.id}`)
                            }}
                            className="rounded p-1 hover:bg-accent"
                            title="查看详情"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {['queued', 'succeeded', 'failed', 'expired'].includes(task.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(task.id)
                              }}
                              className="rounded p-1 hover:bg-accent text-destructive"
                              title="删除"
                            >
                              <Trash2Icon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      }
      right={preview}
    />
  )
}

function useTaskPreview() {
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null)
  const [selectedLog, setSelectedLog] = useState<Record<string, unknown> | null>(null)
  const [taskParams, setTaskParams] = useState<Record<string, unknown> | null>(null)
  const [firstFrameDisplay, setFirstFrameDisplay] = useState<string | null>(null)
  const [lastFrameDisplay, setLastFrameDisplay] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [storageDir, setStorageDir] = useState('')
  const [keyframes, setKeyframes] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    window.api.file.getDefaultPath().then((dir) => setStorageDir(dir)).catch(() => {})
  }, [])

  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }
  }, [])

  const selectTask = useCallback(async (task: TaskItem | null) => {
    if (!task) {
      setSelectedId(null)
      setSelectedTask(null)
      setVideoUrl('')
      return
    }
    setSelectedId(task.id)
    setSelectedTask(null)
    setSelectedLog(null)
    setTaskParams(null)
    setFirstFrameDisplay(null)
    setLastFrameDisplay(null)
    setVideoUrl('')
    setKeyframes([])
    setPreviewLoading(true)

    try {
      const detail = await window.api.seedance.getTask(task.id) as TaskDetail

      let logEntry: Record<string, unknown> | null = null
      try { logEntry = await window.api.logs.getTaskLog(task.id) as Record<string, unknown> | null } catch { /* best-effort */ }

      setSelectedTask(detail)
      setSelectedLog(logEntry)

      try {
        const params = await window.api.taskParams.getByTaskId(task.id) as Record<string, unknown> | null
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
      } catch { /* task params may not exist yet */ }

      if (detail.status === 'succeeded' && detail.content?.video_url) {
        const remoteUrl = detail.content.video_url
        try {
          const filename = `Seedance_${task.id}_preview_${Date.now()}`
          const localPath = await window.api.file.downloadVideo({ url: remoteUrl, destDir: storageDir, filename })
          const buffer = await window.api.file.readFileBuffer(localPath)
          const blob = new Blob([buffer], { type: 'video/mp4' })
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = URL.createObjectURL(blob)
          setVideoUrl(blobUrlRef.current)
        } catch {
          setVideoUrl(remoteUrl)
        }
      }
    } catch { /* preview load failed silently */ } finally {
      setPreviewLoading(false)
    }
  }, [storageDir])

  const getPrompt = (): string => {
    if (taskParams?.prompt) return taskParams.prompt as string
    if (selectedLog?.prompt) return selectedLog.prompt as string
    if (selectedLog?.params) {
      try {
        const parsed = JSON.parse(selectedLog.params as string)
        const content = parsed.content || []
        const textItem = content.find((c: { type: string; text?: string }) => c.type === 'text')
        return textItem?.text || ''
      } catch { return '' }
    }
    return ''
  }

  const handleDownload = useCallback(async () => {
    if (!selectedTask?.content?.video_url) return
    try {
      await window.api.file.downloadVideo({
        url: selectedTask.content.video_url,
        destDir: storageDir,
        filename: `Seedance_${selectedTask.id}_${Date.now()}`
      })
    } catch { /* fail silently */ }
  }, [selectedTask, storageDir])

  const handleKeyframeCapture = useCallback((dataUrl: string) => {
    setKeyframes((prev) => [...prev, dataUrl])
  }, [])

  const preview = (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 min-h-[200px] flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
            <ChevronRightIcon className="h-10 w-10" />
            <span className="text-sm">请选择一个任务</span>
          </div>
        ) : previewLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2Icon className="h-6 w-6 animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : selectedTask?.status === 'succeeded' && videoUrl ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 relative">
              <VideoPlayer
                videoUrl={videoUrl}
                taskId={selectedTask.id}
                storageDir={storageDir}
                onKeyframeCapture={handleKeyframeCapture}
                onDownload={handleDownload}
              />
            </div>
            {keyframes.length > 0 && (
              <div className="border-t border-border p-2">
                <div className="flex gap-1.5 overflow-x-auto">
                  {keyframes.map((dataUrl, i) => (
                    <img key={i} src={dataUrl} alt={`关键帧 ${i + 1}`} className="h-14 w-auto rounded border border-border flex-shrink-0" />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : selectedTask?.status === 'failed' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6">
            <StatusBadge status={selectedTask.status} />
            <p className="text-sm text-destructive text-center">{selectedTask.error?.message || '任务执行失败'}</p>
          </div>
        ) : ['queued', 'running'].includes(selectedTask?.status || '') ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2Icon className="h-6 w-6 animate-spin" />
            <span className="text-sm">{selectedTask?.status === 'queued' ? '排队中...' : '正在生成...'}</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
            <StatusBadge status={selectedTask?.status || ''} />
            <span className="text-sm">无可用视频</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 max-h-[280px] overflow-y-auto">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
            <FileTextIcon className="h-8 w-8" />
            <span className="text-xs">选择任务查看详情</span>
          </div>
        ) : previewLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {getPrompt() && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">提示词</p>
                <p className="text-sm leading-relaxed line-clamp-4">{getPrompt()}</p>
              </div>
            )}

            {(firstFrameDisplay || lastFrameDisplay) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">参考图片</p>
                <div className="flex gap-2">
                  {firstFrameDisplay && (
                    <div className="relative group">
                      <img src={firstFrameDisplay} alt="首帧" className="h-16 w-auto rounded border border-border object-cover" />
                      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">首帧</span>
                    </div>
                  )}
                  {lastFrameDisplay && (
                    <div className="relative group">
                      <img src={lastFrameDisplay} alt="尾帧" className="h-16 w-auto rounded border border-border object-cover" />
                      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">尾帧</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-border">
              <InfoRow label="任务 ID" value={selectedTask?.id || ''} mono />
              <InfoRow label="状态" value={STATUS_LABEL[selectedTask?.status || ''] || selectedTask?.status || ''} />
              <InfoRow label="模型" value={selectedTask?.model || ''} />
              <InfoRow label="宽高比" value={selectedTask?.ratio || '-'} />
              <InfoRow label="分辨率" value={selectedTask?.resolution || '-'} />
              <InfoRow label="时长" value={selectedTask?.duration ? `${selectedTask.duration} 秒` : '-'} />
              <InfoRow label="音频" value={selectedTask?.generate_audio === undefined ? '-' : selectedTask.generate_audio ? '有声' : '无声'} />
              <InfoRow label="创建时间" value={selectedTask?.created_at ? new Date(selectedTask.created_at * 1000).toLocaleString('zh-CN') : '-'} />
            </div>

            {selectedTask?.status === 'failed' && selectedTask?.error && (
              <div className="rounded-md bg-destructive/10 p-2.5">
                <p className="text-xs font-medium text-destructive">错误：{selectedTask.error.code}</p>
                <p className="text-xs text-destructive/80 mt-0.5">{selectedTask.error.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return { preview, selectTask }
}
