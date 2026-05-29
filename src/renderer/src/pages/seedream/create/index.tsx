import React, { useState, useCallback } from 'react'
import { ImageIcon, DownloadIcon, ChevronRightIcon, Loader2Icon } from 'lucide-react'
import { TwoColumnLayout } from '@/components/two-column-layout'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreateForm, type CreateFormMeta } from './components/create-form'
import { cn } from '@/lib/utils'
import type { GeneratedImage } from '../types'

export default function SeedreamCreatePage(): React.JSX.Element {
  const [results, setResults] = useState<GeneratedImage[]>([])
  const [usage, setUsage] = useState<{ generated_images: number; output_tokens: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<CreateFormMeta | null>(null)

  const handleSubmit = useCallback(async (apiParams: Record<string, unknown>, formMeta: CreateFormMeta) => {
    setLoading(true)
    setResults([])
    setUsage(null)
    setMeta(formMeta)
    try {
      const result = await window.api.seedream.generateImage(apiParams) as {
        data?: GeneratedImage[]
        usage?: { generated_images: number; output_tokens: number }
      }
      if (result.data) {
        setResults(result.data)
      }
      if (result.usage) {
        setUsage(result.usage)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const renderRight = () => {
    if (!meta) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[300px]">
          <ChevronRightIcon className="h-10 w-10" />
          <span className="text-sm">输入提示词后点击"生成图片"</span>
        </div>
      )
    }

    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[300px]">
          <Loader2Icon className="h-8 w-8 animate-spin" />
          <span className="text-sm">正在生成图片...</span>
        </div>
      )
    }

    if (results.length > 0) {
      return (
        <div className="flex-1 flex flex-col gap-3">
          <h3 className="text-sm font-medium">生成结果</h3>
          <div className={cn(
            'grid gap-3',
            results.length === 1 && 'grid-cols-1',
            results.length === 2 && 'grid-cols-2',
            results.length > 2 && 'grid-cols-2 lg:grid-cols-3'
          )}>
            {results.map((img, idx) => (
              <div key={idx} className="rounded-md border border-border overflow-hidden bg-muted">
                <img
                  src={img.url || (img.b64_json ? `data:image/${meta.outputFormat};base64,${img.b64_json}` : '')}
                  alt={`生成图片 ${idx + 1}`}
                  className="w-full h-auto object-cover"
                />
                <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50">
                  <span className="text-xs text-muted-foreground">
                    {img.size || img.revised_prompt ? '含修订提示词' : `图片 ${idx + 1}`}
                  </span>
                  {img.url && (
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <DownloadIcon className="size-3" />
                      下载
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          {usage && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <Separator className="mb-2" />
              <Badge variant="secondary">生成 {usage.generated_images} 张</Badge>
              <Badge variant="outline">Token: {usage.output_tokens}</Badge>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <TwoColumnLayout
      leftClassName="w-1/2"
      rightClassName="w-1/2"
      left={
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ImageIcon className="size-6" />
              图片创作
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              使用 Seedream 5.0 lite 模型，支持文生图、图文生图、多图融合和组图生成
            </p>
          </div>
          <CreateForm onSubmit={handleSubmit} />
        </div>
      }
      right={
        <div className="rounded-lg border border-border bg-card p-4 h-full flex flex-col gap-3">
          {renderRight()}
        </div>
      }
    />
  )
}
