import React, { useState, useEffect, useCallback } from 'react'
import { ListTodoIcon, RefreshCwIcon, Loader2Icon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'succeeded', label: '已完成' },
  { value: 'failed', label: '失败' }
]

const STATUS_BADGE: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

const STATUS_LABEL: Record<string, string> = {
  succeeded: '已完成',
  failed: '失败'
}

interface LogRow {
  id: number
  version: string
  task_id: string | null
  operation: string
  model: string
  prompt: string | null
  status: string | null
  image_count: number
  video_count: number
  audio_count: number
  params: string | null
  result: string | null
  error: string | null
  created_at: string
}

export default function SeedreamTasksPage(): React.JSX.Element {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const pageSize = 20

  const fetchLogs = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await window.api.logs.query({
        version: '5.0',
        operation: 'create',
        page,
        pageSize
      })
      let items = result.items || []
      let totalCount = result.total || 0

      if (statusFilter) {
        items = items.filter((log) => log.status === statusFilter)
        totalCount = items.length
      }

      setLogs(items)
      setTotal(totalCount)
    } catch (err) {
      console.error('获取日志失败:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const formatParams = (paramsStr: string | null): Record<string, unknown> | null => {
    if (!paramsStr) return null
    try {
      return JSON.parse(paramsStr)
    } catch {
      return null
    }
  }

  const formatResult = (resultStr: string | null): { urls: string[] } | null => {
    if (!resultStr) return null
    try {
      const parsed = JSON.parse(resultStr)
      const urls: string[] = []
      if (parsed.data && Array.isArray(parsed.data)) {
        for (const item of parsed.data) {
          if (item.url) urls.push(item.url)
        }
      }
      return { urls }
    } catch {
      return null
    }
  }

  const renderParams = (params: Record<string, unknown>): React.JSX.Element => {
    const s = params.size as string | undefined
    const fmt = params.output_format as string | undefined
    const seq = params.sequential_image_generation as string | undefined
    const wm = params.watermark as boolean | undefined
    return (
      <div className="space-y-1 text-xs">
        {s && <div><span className="text-muted-foreground">尺寸: </span>{s}</div>}
        {fmt && <div><span className="text-muted-foreground">格式: </span>{fmt}</div>}
        {seq && <div><span className="text-muted-foreground">组图模式: </span>{seq === 'auto' ? '开启' : '关闭'}</div>}
        {wm !== undefined && <div><span className="text-muted-foreground">水印: </span>{wm ? '开启' : '关闭'}</div>}
      </div>
    )
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListTodoIcon className="h-6 w-6" />
          图片列表
        </h1>
        <button
          onClick={fetchLogs}
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

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8"></th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">提示词</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">参考图</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <Loader2Icon className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground">
                  暂无生成记录
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const params = formatParams(log.params)
                const result = formatResult(log.result)
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-2.5">
                        {expandedId === log.id ? (
                          <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 truncate max-w-[300px]">
                        {log.prompt || '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[log.status || ''] || 'bg-gray-100'}`}>
                          {STATUS_LABEL[log.status || ''] || log.status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {log.image_count || 0} 张
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {log.created_at}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`} className="border-b border-border bg-muted/20">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left: Params + Error */}
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground mb-1">请求参数</h4>
                                <div className="rounded-md border border-border bg-background p-3">
                                  {params ? renderParams(params) : <span className="text-xs text-muted-foreground">-</span>}
                                  <div className="mt-2">
                                    <span className="text-xs text-muted-foreground">模型: </span>
                                    <span className="text-xs font-mono">{log.model}</span>
                                  </div>
                                </div>
                              </div>
                              {log.error && (
                                <div>
                                  <h4 className="text-xs font-medium text-red-600 mb-1">错误信息</h4>
                                  <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-3">
                                    <p className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap">{log.error}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Right: Result Images */}
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground mb-1">生成结果</h4>
                              {result && result.urls.length > 0 ? (
                                <div className={`grid gap-2 ${result.urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                  {result.urls.map((url, idx) => (
                                    <div key={idx} className="rounded-md border border-border overflow-hidden bg-muted">
                                      <img
                                        src={url}
                                        alt={`结果 ${idx + 1}`}
                                        className="w-full h-auto object-cover"
                                        loading="lazy"
                                      />
                                      <div className="px-2 py-1 bg-muted/50 flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground">图片 {idx + 1}</span>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] text-primary hover:underline"
                                        >
                                          查看原图
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground py-4 text-center">无结果图片</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
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
