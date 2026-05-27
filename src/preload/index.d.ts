import { ElectronAPI } from '@electron-toolkit/preload'

interface SeedanceAPI {
  createTask: (params: unknown) => Promise<unknown>
  getTask: (id: string) => Promise<unknown>
  listTasks: (query: string) => Promise<unknown>
  deleteTask: (id: string) => Promise<unknown>
}

interface SeedreamAPI {
  generateImage: (params: unknown) => Promise<unknown>
}

interface DialogAPI {
  openFile: (filters?: Electron.FileFilter[]) => Promise<string | null>
  selectDirectory: () => Promise<string | null>
}

interface FileAPI {
  readBase64: (filePath: string) => Promise<string>
  getDefaultPath: () => Promise<string>
  downloadVideo: (opts: { url: string; destDir: string; filename: string }) => Promise<string>
  saveKeyframe: (opts: { base64Data: string; destDir: string; filename: string }) => Promise<string>
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer>
  readKeyframes: (opts: { dir: string; taskId: string }) => Promise<{ autoFrames: (string | null)[]; manualFrames: string[] }>
  deleteFile: (filePath: string) => Promise<void>
  resolveImagePath: (opts: { storageDir: string; relativePath: string }) => Promise<string | null>
}

interface TaskParamsAPI {
  save: (entry: {
    task_id: string
    version: string
    prompt: string | null
    ratio: string | null
    duration: number | null
    resolution: string | null
    generate_audio: number
    watermark: number
    model: string | null
    first_frame_path: string | null
    last_frame_path: string | null
    first_frame_data: string | null
    last_frame_data: string | null
    full_params: string | null
  }) => Promise<void>
  getByTaskId: (taskId: string) => Promise<{
    id: number
    task_id: string
    version: string
    prompt: string | null
    ratio: string | null
    duration: number | null
    resolution: string | null
    generate_audio: number
    watermark: number
    model: string | null
    first_frame_path: string | null
    last_frame_path: string | null
    first_frame_data: string | null
    last_frame_data: string | null
    full_params: string | null
    created_at: string
  } | null>
}

interface PathAPI {
  relative: (from: string, to: string) => Promise<string>
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
  getTaskLog: (taskId: string) => Promise<LogEntry | null>
}

interface SettingsData {
  seedance15Key: string
  seedance20Key: string
  seedream50Key: string
  userInfo: { name: string; email: string }
  theme: string
}

interface SettingsAPI {
  get: () => Promise<SettingsData>
  set: (partial: Partial<SettingsData>) => Promise<SettingsData>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      seedance: SeedanceAPI
      seedance2: SeedanceAPI
      seedream: SeedreamAPI
      dialog: DialogAPI
      file: FileAPI
      logs: LogsAPI
      settings: SettingsAPI
      taskParams: TaskParamsAPI
      path: PathAPI
    }
  }
}
