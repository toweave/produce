import React, { useState, useEffect, useCallback } from 'react'
import { HistoryIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon, Loader2Icon } from 'lucide-react'

const OPERATION_LABEL: Record<string, string> = {
  create: '创建任务',
  get: '查询任务',
  list: '任务列表',
  delete: '删除任务'
}

const OPERATION_BADGE: Record<string, string> = {
  create: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  get: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  list: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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

interface Props {
  defaultVersion: string
}

export default function LogsViewer({ defaultVersion }: Props): React.JSX.Element {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [operationFilter, setOperationFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const pageSize = 20

  const fetchLogs = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await window.api.logs.query({
        version: defaultVersion,
        operation: operationFilter || undefined,
        page,
        pageSize
      })
      setLogs(result.items || [])
      setTotal(result.total || 0)
    } catch (err) {
      console.error('获取日志失败:', err)
    } finally {
      setLoading(false)
    }
  }, [defaultVersion, operationFilter, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HistoryIcon className="h-6 w-6" />
          操作日志
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
        <button
          onClick={() => { setOperationFilter(''); setPage(1) }}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            operationFilter === '' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          全部
        </button>
        {Object.entries(OPERATION_LABEL).map(([value, label]) => (
          <button
            key={value}
            onClick={() => { setOperationFilter(value); setPage(1) }}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              operationFilter === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">时间</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">操作</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">任务 ID</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">模型</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">详情</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <Loader2Icon className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground">
                  暂无操作日志
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{log.created_at}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${OPERATION_BADGE[log.operation] || ''}`}>
                        {OPERATION_LABEL[log.operation] || log.operation}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[180px]">{log.task_id || '-'}</td>
                    <td className="px-4 py-2.5 text-xs truncate max-w-[200px]">{log.model || '-'}</td>
                    <td className="px-4 py-2.5 text-xs">{log.status || (log.error ? '失败' : '-')}</td>
                    <td className="px-4 py-2.5 text-right">
                      {expandedId === log.id ? <ChevronUpIcon className="h-4 w-4 inline" /> : <ChevronDownIcon className="h-4 w-4 inline" />}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-muted/20">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-3 text-xs font-mono">
                          {log.error && (
                            <div>
                              <span className="font-semibold text-destructive">错误：</span>
                              <span className="text-destructive">{log.error}</span>
                            </div>
                          )}
                          {log.prompt && (
                            <div>
                              <span className="font-semibold text-muted-foreground">提示词：</span>
                              <span>{log.prompt}</span>
                            </div>
                          )}
                          {(log.image_count > 0 || log.video_count > 0 || log.audio_count > 0) && (
                            <div>
                              <span className="font-semibold text-muted-foreground">素材：</span>
                              <span>{log.image_count} 图片 / {log.video_count} 视频 / {log.audio_count} 音频</span>
                            </div>
                          )}
                          {log.params && (
                            <div>
                              <span className="font-semibold text-muted-foreground">参数：</span>
                              <pre className="mt-1 whitespace-pre-wrap break-all text-xs text-muted-foreground">{tryFormatJSON(log.params)}</pre>
                            </div>
                          )}
                          {log.result && (
                            <div>
                              <span className="font-semibold text-muted-foreground">结果：</span>
                              <pre className="mt-1 whitespace-pre-wrap break-all text-xs text-muted-foreground">{tryFormatJSON(log.result)}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

function tryFormatJSON(str: string): string {
  try {
    const parsed = JSON.parse(str)
    if (typeof parsed === 'object') {
      // Truncate long arrays in result display
      if (parsed.items && Array.isArray(parsed.items)) {
        return `${JSON.stringify({ ...parsed, items: `[${parsed.items.length} items]` }, null, 2)}`
      }
      return JSON.stringify(parsed, null, 2)
    }
    return str
  } catch {
    return str
  }
}
