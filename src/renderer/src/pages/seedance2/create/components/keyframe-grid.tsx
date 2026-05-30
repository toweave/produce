import React from 'react'
import { Loader2Icon, ImageIcon } from 'lucide-react'

interface KeyframeGridProps {
  autoKeyframes: string[]
  manualKeyframes: string[]
  capturingAuto: boolean
  hasVideo: boolean
  onSetFirstFrame?: (dataUrl: string) => void
  onSetLastFrame?: (dataUrl: string) => void
  onDeleteManualKeyframe?: (index: number) => void
  onClearAllKeyframes?: () => void
}

export function KeyframeGrid({
  autoKeyframes,
  manualKeyframes,
  capturingAuto,
  hasVideo,
  onSetFirstFrame,
  onSetLastFrame,
  onDeleteManualKeyframe,
  onClearAllKeyframes
}: KeyframeGridProps): React.JSX.Element {
  if (capturingAuto) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-y-auto min-h-[180px] p-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground h-full">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          正在提取关键帧...
        </div>
      </div>
    )
  }

  const hasFrames = autoKeyframes.length > 0 || manualKeyframes.length > 0

  if (!hasFrames) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-y-auto min-h-[180px] p-4">
        <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground h-full">
          <ImageIcon className="h-6 w-6" />
          {hasVideo ? '暂无关键帧' : '视频生成完成后将自动显示关键帧'}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-y-auto max-h-[360px] p-4">
      <div className="space-y-3">
        {autoKeyframes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">自动关键帧</p>
            <div className="grid grid-cols-3 gap-2">
              {autoKeyframes.map((dataUrl, i) => (
                <div key={`auto-${i}`} className="relative group">
                  <img
                    src={dataUrl}
                    alt={`关键帧 ${i}`}
                    className="w-full rounded border border-border object-cover aspect-video"
                  />
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                    {i === 0 ? '开头' : i === autoKeyframes.length - 1 ? '结尾' : `${Math.round((i / (autoKeyframes.length - 1)) * 100)}%`}
                  </span>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1.5">
                    {onSetFirstFrame && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSetFirstFrame(dataUrl) }}
                        className="rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-black hover:bg-white transition-colors"
                        title="引用为首帧"
                      >
                        首帧
                      </button>
                    )}
                    {onSetLastFrame && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSetLastFrame(dataUrl) }}
                        className="rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-black hover:bg-white transition-colors"
                        title="引用为尾帧"
                      >
                        尾帧
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {manualKeyframes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">手动截图</p>
              {onClearAllKeyframes && (
                <button
                  onClick={onClearAllKeyframes}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  清空全部
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {manualKeyframes.map((dataUrl, i) => (
                <div key={`manual-${i}`} className="relative group">
                  <img
                    src={dataUrl}
                    alt={`手动截图 ${i}`}
                    className="w-full rounded border border-border object-cover aspect-video"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1.5">
                    {onSetFirstFrame && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSetFirstFrame(dataUrl) }}
                        className="rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-black hover:bg-white transition-colors"
                        title="引用为首帧"
                      >
                        首帧
                      </button>
                    )}
                    {onSetLastFrame && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSetLastFrame(dataUrl) }}
                        className="rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-black hover:bg-white transition-colors"
                        title="引用为尾帧"
                      >
                        尾帧
                      </button>
                    )}
                    {onDeleteManualKeyframe && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteManualKeyframe(i) }}
                        className="rounded bg-red-500/90 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-600 transition-colors"
                        title="删除"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
