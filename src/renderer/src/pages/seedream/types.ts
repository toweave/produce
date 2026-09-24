export type Resolution = '2K' | '3K' | '4K'
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9'
export type OutputFormat = 'png' | 'jpeg'

export interface GeneratedImage {
  url?: string
  b64_json?: string
  size?: string
  revised_prompt?: string
}

export interface MediaItem {
  id: string
  dataUri: string
  name: string
}

export interface LogEntry {
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
