import type { ModelId, Ratio, Resolution } from './types'

export const MODELS: { value: ModelId; label: string }[] = [
  { value: 'doubao-seedance-2-0-260128', label: 'Doubao-Seedance-2.0' },
  { value: 'doubao-seedance-2-0-fast-260128', label: 'Doubao-Seedance-2.0-Fast' }
]

export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '运行中' },
  { value: 'succeeded', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已过期' }
]

export const STATUS_LABEL: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  expired: '已过期'
}

export const STATUS_BADGE: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
}

export const RATIO_OPTIONS: { value: Ratio; label: string }[] = [
  { value: 'adaptive', label: '自适应' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '9:16', label: '9:16' },
  { value: '21:9', label: '21:9' }
]

export const DURATION_OPTIONS = [
  { value: -1, label: '自动' },
  ...Array.from({ length: 12 }, (_, i) => i + 4).map((d) => ({
    value: d,
    label: `${d} 秒`
  }))
]

export const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' }
]

export const AUDIO_OPTIONS = [
  { value: true, label: '生成音频' },
  { value: false, label: '无声' }
]
