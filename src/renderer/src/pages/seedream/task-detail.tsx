import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, Loader2Icon, DownloadIcon, FileTextIcon, ImageIcon, AlertCircleIcon } from 'lucide-react'
import { StatusBadge } from './components/status-badge'
import { InfoItem } from './components/info-item'
import { STATUS_LABEL } from './constants'
import type { LogEntry } from './types'

export default function SeedreamTaskDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [log, setLog] = useState<LogEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    window.api.logs.getById(Number(id))
      .then((result) => {
        if (result) {
          setLog(result)
        } else {
          setError('记录不存在')
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-6">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className="w-full p-6">
        <button
          onClick={() => navigate('/seedream/tasks')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" /> 返回记录列表
        </button>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error || '记录不存在'}
        </div>
      </div>
    )
  }

  const params = (() => {
    if (!log.params) return null
    try { return JSON.parse(log.params) as Record<string, unknown> } catch { return null }
  })()

  const resultImages = (() => {
    if (!log.result) return []
    try {
      const parsed = JSON.parse(log.result)
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data as Array<{ url?: string; b64_json?: string; size?: string; revised_prompt?: string }>
      }
      return []
    } catch { return [] }
  })()

  const outputFormat = (params?.output_format as string) || 'png'

  return (
    <div className="w-full p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/seedream/tasks')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" /> 返回记录列表
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">生成详情</h1>
          <span className="text-xs font-mono text-muted-foreground">#{log.id}</span>
        </div>
        <StatusBadge status={log.status || ''} />
      </div>

      {/* Prompt */}
      {log.prompt && (
        <div className="rounded-lg border border-border bg-card p-4 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <FileTextIcon className="size-3.5" />
            提示词
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{log.prompt}</p>
        </div>
      )}

      {/* Result images */}
      {resultImages.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
            <ImageIcon className="size-3.5" />
            生成结果（{resultImages.length} 张）
          </p>
          <div className={`grid gap-3 ${resultImages.length === 1 ? 'grid-cols-1' : resultImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {resultImages.map((img, idx) => {
              const src = img.url || (img.b64_json ? `data:${outputFormat === 'png' ? 'image/png' : 'image/jpeg'};base64,${img.b64_json}` : '')
              return (
                <div key={idx} className="rounded-md border border-border overflow-hidden bg-muted">
                  <img src={src} alt={`生成图片 ${idx + 1}`} className="w-full h-auto object-cover" loading="lazy" />
                  <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50">
                    <span className="text-xs text-muted-foreground">{img.size || `图片 ${idx + 1}`}</span>
                    {img.url && (
                      <a href={img.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <DownloadIcon className="size-3" />
                        下载
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {log.error && (
        <div className="rounded-lg bg-destructive/10 p-4 mb-4">
          <p className="text-xs font-medium text-destructive mb-1 flex items-center gap-1">
            <AlertCircleIcon className="size-3.5" />
            错误信息
          </p>
          <p className="text-sm text-destructive/80 whitespace-pre-wrap">{log.error}</p>
        </div>
      )}

      {/* Basic info + Params in two columns */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Basic info */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">基本信息</p>
          <InfoItem label="记录 ID" value={String(log.id)} />
          <InfoItem label="状态" value={STATUS_LABEL[log.status || ''] || log.status || '-'} />
          <InfoItem label="模型" value={log.model} />
          <InfoItem label="参考图片" value={log.image_count ? `${log.image_count} 张` : '无'} />
          <InfoItem label="创建时间" value={log.created_at || '-'} />
        </div>

        {/* Generation params */}
        {params && (
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">生成参数</p>
            {!!params.size && <InfoItem label="尺寸" value={String(params.size)} />}
            {!!params.output_format && <InfoItem label="输出格式" value={String(params.output_format)} />}
            {params.watermark !== undefined && <InfoItem label="水印" value={params.watermark ? '开启' : '关闭'} />}
            {!!params.sequential_image_generation && (
              <InfoItem label="组图模式" value={(params.sequential_image_generation as string) === 'auto' ? '开启' : '关闭'} />
            )}
            {!!params.tools && Array.isArray(params.tools) && params.tools.length > 0 && (
              <InfoItem label="联网搜索" value="开启" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
