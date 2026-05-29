export type ModelId = 'doubao-seedance-2-0-260128' | 'doubao-seedance-2-0-fast-260128'
export type Ratio = 'adaptive' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9'
export type Resolution = '480p' | '720p' | '1080p'

export interface ContentInfo {
  video_url?: string
  last_frame_url?: string
}

export interface TaskItem {
  id: string
  status: string
  model: string
  created_at: number
  duration?: number
  ratio?: string
  resolution?: string
  error?: { code: string; message: string } | null
}

export interface TaskDetail {
  id: string
  status: string
  model: string
  created_at: number
  updated_at: number
  content?: ContentInfo
  error?: { code: string; message: string } | null
  duration?: number
  ratio?: string
  resolution?: string
  seed?: number
  framespersecond?: number
  generate_audio?: boolean
  service_tier?: string
  usage?: { completion_tokens: number; total_tokens: number }
}
