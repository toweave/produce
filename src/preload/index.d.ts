import { ElectronAPI } from '@electron-toolkit/preload'

interface SeedanceAPI {
  createTask: (params: unknown) => Promise<unknown>
  getTask: (id: string) => Promise<unknown>
  listTasks: (query: string) => Promise<unknown>
  deleteTask: (id: string) => Promise<unknown>
}

interface DialogAPI {
  openFile: (filters?: Electron.FileFilter[]) => Promise<string | null>
}

interface FileAPI {
  readBase64: (filePath: string) => Promise<string>
}

interface LogEntry {
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

interface LogQueryOptions {
  version: string
  operation?: string
  page: number
  pageSize: number
}

interface LogQueryResult {
  items: LogEntry[]
  total: number
}

interface LogsAPI {
  query: (options: LogQueryOptions) => Promise<LogQueryResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      seedance: SeedanceAPI
      seedance2: SeedanceAPI
      dialog: DialogAPI
      file: FileAPI
      logs: LogsAPI
    }
  }
}
