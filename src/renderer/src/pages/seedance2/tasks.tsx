import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListTodoIcon, RefreshCwIcon, Trash2Icon, EyeIcon, Loader2Icon, SettingsIcon } from 'lucide-react'
import { handleApiError } from '@/lib/api-errors'

interface TaskItem {
  id: string
  status: string
  model: string
  created_at: number
  duration?: number
  ratio?: string
  resolution?: string
  error?: { code: string; message: string } | null
}

interface ListResponse {
  items: TaskItem[]
  total: number
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '运行中' },
  { value: 'succeeded', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已过期' }
]

const STATUS_BADGE: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
}

const STATUS_LABEL: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  expired: '已过期'
}

export default function Seedance2TasksPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const pageSize = 20

  const fetchTasks = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError('')
    setApiKeyMissing(false)
    try {
      const params = new URLSearchParams()
      params.set('page_size', String(pageSize))
      params.set('page_num', String(page))
      if (statusFilter) {
        params.set('filter.status', statusFilter)
      }
      const result = await window.api.seedance2.listTasks(`?${params.toString()}`) as ListResponse
      setTasks(result.items || [])
      setTotal(result.total || 0)
    } catch (err) {
      const { message, isMissing } = handleApiError(err, '2.0', '获取任务列表失败')
      setError(message)
      setApiKeyMissing(isMissing)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await window.api.seedance2.deleteTask(id)
      fetchTasks()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
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

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1) }}
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

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">任务 ID</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">模型</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">创建时间</th>
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
                <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[200px]">{task.id}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[task.status] || 'bg-gray-100'}`}>
                      {STATUS_LABEL[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{task.model}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {task.created_at ? new Date(task.created_at * 1000).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => navigate(`/seedance2/tasks/${task.id}`)}
                        className="rounded p-1 hover:bg-accent"
                        title="查看详情"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {['queued', 'succeeded', 'failed', 'expired'].includes(task.status) && (
                        <button
                          onClick={() => handleDelete(task.id)}
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

      {/* Pagination */}
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
  )
}
