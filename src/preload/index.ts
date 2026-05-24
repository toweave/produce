import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  seedance: {
    createTask: (params) => ipcRenderer.invoke('seedance:create-task', params),
    getTask: (id) => ipcRenderer.invoke('seedance:get-task', id),
    listTasks: (query) => ipcRenderer.invoke('seedance:list-tasks', query),
    deleteTask: (id) => ipcRenderer.invoke('seedance:delete-task', id)
  },
  seedance2: {
    createTask: (params) => ipcRenderer.invoke('seedance2:create-task', params),
    getTask: (id) => ipcRenderer.invoke('seedance2:get-task', id),
    listTasks: (query) => ipcRenderer.invoke('seedance2:list-tasks', query),
    deleteTask: (id) => ipcRenderer.invoke('seedance2:delete-task', id)
  },
  dialog: {
    openFile: (filters) => ipcRenderer.invoke('dialog:open-file', filters),
    selectDirectory: () => ipcRenderer.invoke('dialog:select-directory')
  },
  file: {
    readBase64: (filePath) => ipcRenderer.invoke('file:read-base64', filePath),
    getDefaultPath: () => ipcRenderer.invoke('file:get-default-path'),
    downloadVideo: (opts) => ipcRenderer.invoke('file:download-video', opts),
    saveKeyframe: (opts) => ipcRenderer.invoke('file:save-keyframe', opts),
    readFileBuffer: (filePath) => ipcRenderer.invoke('file:read-file-buffer', filePath),
    readKeyframes: (opts) => ipcRenderer.invoke('file:read-keyframes', opts),
    deleteFile: (filePath) => ipcRenderer.invoke('file:delete-file', filePath)
  },
  logs: {
    query: (options) => ipcRenderer.invoke('logs:query', options)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (partial) => ipcRenderer.invoke('settings:set', partial)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
