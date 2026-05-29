import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListTodoIcon, RefreshCwIcon, Loader2Icon, EyeIcon, ChevronRightIcon } from 'lucide-react'
import { TwoColumnLayout } from '@/components/two-column-layout'
import { Button } from '@/components/ui/button'
import { STATUS_OPTIONS, STATUS_LABEL } from './constants'
import { StatusBadge } from './components/status-badge'
import type { LogEntry } from './types'

export default function SeedreamTasksPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const pageSize = 20

  // Load logs with optional client-side filter
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

      // Client-side filter for status
      if (statusFilter) {
        items = items.filter((log) => log.status === statusFilter)
      }

      setLogs(items)
      setTotal(result.total || 0)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSelectLog = (log: LogEntry) => {
    setSelectedLog(log)
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    setSelectedLog(null)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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

  const formatParams = (paramsStr: string | null): Record<string, unknown> | null => {
    if (!paramsStr) return null
    try {
      return JSON.parse(paramsStr)
    } catch {
      return null
    }
  }

  const renderPreview = () => {
    if (!selectedLog) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[300px]">
          <ChevronRightIcon className="h-10 w-10" />
          <span className="text-sm">请选择一个生成记录</span>
        </div>
      )
    }

    const result = formatResult(selectedLog.result)
    const params = formatParams(selectedLog.params)

    return (
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {/* Prompt */}
        {selectedLog.prompt && (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">提示词</p>
            <p className="text-sm leading-relaxed">{selectedLog.prompt}</p>
          </div>
        )}

        {/* Result images */}
        {result && result.urls.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">生成结果（{result.urls.length} 张）</p>
            <div className={`grid gap-2 ${result.urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {result.urls.map((url, idx) => (
                <div key={idx} className="rounded-md border border-border overflow-hidden bg-muted">
                  <img src={url} alt={`结果 ${idx + 1}`} className="w-full h-auto object-cover" loading="lazy" />
                  <div className="px-2 py-1 bg-muted/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">图片 {idx + 1}</span>
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">查看原图</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Params */}
        {params && (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">生成参数</p>
            <div className="space-y-1.5 text-xs">
              <div><span className="text-muted-foreground">模型: </span>{selectedLog.model}</div>
              {!!params.size && <div><span className="text-muted-foreground">尺寸: </span>{String(params.size)}</div>}
              {!!params.output_format && <div><span className="text-muted-foreground">格式: </span>{String(params.output_format)}</div>}
              {params.watermark !== undefined && <div><span className="text-muted-foreground">水印: </span>{params.watermark ? '开启' : '关闭'}</div>}
              {!!params.sequential_image_generation && <div><span className="text-muted-foreground">组图: </span>{(params.sequential_image_generation as string) === 'auto' ? '开启' : '关闭'}</div>}
              {selectedLog.image_count > 0 && <div><span className="text-muted-foreground">参考图: </span>{selectedLog.image_count} 张</div>}
            </div>
          </div>
        )}

        {/* Error */}
        {selectedLog.error && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-xs font-medium text-destructive mb-1">错误信息</p>
            <p className="text-xs text-destructive/80 whitespace-pre-wrap">{selectedLog.error}</p>
          </div>
        )}

        {/* Status & time */}
        <div className="text-xs text-muted-foreground">
          <div>状态：{STATUS_LABEL[selectedLog.status || ''] || selectedLog.status || '-'}</div>
          <div>时间：{selectedLog.created_at || '-'}</div>
        </div>
      </div>
    )
  }

  return (
    <TwoColumnLayout
      leftClassName="w-2/3"
      rightClassName="w-1/3"
      left={
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListTodoIcon className="h-6 w-6" />
              生成记录
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          {/* Filter */}
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

          {/* Table */}
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">提示词</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">参考图</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">时间</th>
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
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      暂无生成记录
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => handleSelectLog(log)}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                        selectedLog?.id === log.id
                          ? 'bg-primary/10 hover:bg-primary/15'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="px-4 py-2.5 truncate max-w-[300px]">
                        {log.prompt || '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={log.status || ''} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {log.image_count || 0} 张
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {log.created_at || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/seedream/tasks/${log.id}`)
                          }}
                          className="rounded p-1 hover:bg-accent"
                          title="查看详情"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
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
      right={
        <div className="rounded-lg border border-border bg-card p-4 h-full flex flex-col">
          {renderPreview()}
        </div>
      }
    />
  )
}
