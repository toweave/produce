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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      seedance: SeedanceAPI
      dialog: DialogAPI
      file: FileAPI
    }
  }
}
