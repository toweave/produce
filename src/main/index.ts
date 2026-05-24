import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase, insertLog, queryLogs } from './database'

const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API_KEY = process.env['VITE_SEE_DANCE_API_KEY'] || ''

const MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', bmp: 'image/bmp', tiff: 'image/tiff',
  gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
  mp3: 'audio/mpeg', wav: 'audio/wav',
  mp4: 'video/mp4', mov: 'video/quicktime'
}

type ContentItem = { type?: string; text?: string }

function extractContentInfo(params: Record<string, unknown>): { prompt: string; imageCount: number; videoCount: number; audioCount: number } {
  const content = (params.content || []) as ContentItem[]
  let prompt = ''
  let imageCount = 0; let videoCount = 0; let audioCount = 0
  for (const item of content) {
    if (item.type === 'text') prompt = (item.text || '').slice(0, 200)
    else if (item.type === 'image_url') imageCount++
    else if (item.type === 'video_url') videoCount++
    else if (item.type === 'audio_url') audioCount++
  }
  return { prompt, imageCount, videoCount, audioCount }
}

async function arkFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${ARK_API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ARK_API_KEY}`,
      ...options.headers
    }
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ARK API error ${res.status}: ${body}`)
  }
  return res.json()
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // Initialize database for operation logging
  initDatabase()

  // --- Seedance IPC handlers ---
  ipcMain.handle('seedance:create-task', async (_event, params) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    const info = extractContentInfo(params as Record<string, unknown>)
    try {
      const result = await arkFetch('/contents/generations/tasks', {
        method: 'POST',
        body: JSON.stringify(params)
      })
      insertLog({ version: '1.5', task_id: (result as Record<string, unknown>)?.id as string || null, operation: 'create', model: String((params as Record<string, unknown>).model || ''), prompt: info.prompt, status: null, image_count: info.imageCount, video_count: info.videoCount, audio_count: info.audioCount, params: JSON.stringify(params), result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '1.5', task_id: null, operation: 'create', model: String((params as Record<string, unknown>).model || ''), prompt: info.prompt, status: null, image_count: info.imageCount, video_count: info.videoCount, audio_count: info.audioCount, params: JSON.stringify(params), result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  ipcMain.handle('seedance:get-task', async (_event, id: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    try {
      const result = await arkFetch(`/contents/generations/tasks/${encodeURIComponent(id)}`)
      insertLog({ version: '1.5', task_id: id, operation: 'get', model: (result as Record<string, unknown>)?.model as string || '', prompt: null, status: (result as Record<string, unknown>)?.status as string || null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '1.5', task_id: id, operation: 'get', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  ipcMain.handle('seedance:list-tasks', async (_event, query: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    try {
      const result = await arkFetch(`/contents/generations/tasks${query}`)
      insertLog({ version: '1.5', task_id: null, operation: 'list', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: query, result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '1.5', task_id: null, operation: 'list', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: query, result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  ipcMain.handle('seedance:delete-task', async (_event, id: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    try {
      const result = await arkFetch(`/contents/generations/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      insertLog({ version: '1.5', task_id: id, operation: 'delete', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '1.5', task_id: id, operation: 'delete', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  ipcMain.handle('dialog:open-file', async (_event, filters?: Electron.FileFilter[]) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters || [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'heic', 'heif'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('file:read-base64', async (_event, filePath: string) => {
    const buffer = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const mime = MIME_MAP[ext] || `image/${ext}`
    return `data:${mime};base64,${buffer.toString('base64')}`
  })

  // --- File/Storage IPC handlers ---
  ipcMain.handle('dialog:select-directory', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('file:get-default-path', async () => {
    return app.getPath('downloads')
  })

  ipcMain.handle('file:download-video', async (_event, { url, destDir, filename }: { url: string; destDir: string; filename: string }) => {
    await mkdir(destDir, { recursive: true })
    const ext = '.mp4'
    const destPath = join(destDir, `${filename}${ext}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`下载视频失败: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    await writeFile(destPath, buffer)
    return destPath
  })

  ipcMain.handle('file:save-keyframe', async (_event, { base64Data, destDir, filename }: { base64Data: string; destDir: string; filename: string }) => {
    await mkdir(destDir, { recursive: true })
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) throw new Error('无效的 Base64 图片数据')
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    const destPath = join(destDir, `${filename}.${ext}`)
    const buffer = Buffer.from(matches[2], 'base64')
    await writeFile(destPath, buffer)
    return destPath
  })

  ipcMain.handle('file:read-keyframes', async (_event, { dir, taskId }: { dir: string; taskId: string }) => {
    const autoFrames: (string | null)[] = []
    for (let i = 0; i < 6; i++) {
      const path = join(dir, `Seedance_${taskId}_keyframe_${i}.png`)
      try {
        const buffer = await readFile(path)
        autoFrames.push(`data:image/png;base64,${buffer.toString('base64')}`)
      } catch {
        autoFrames.push(null)
      }
    }
    const manualFrames: string[] = []
    for (let i = 0; ; i++) {
      const path = join(dir, `Seedance_${taskId}_manual_${i}.png`)
      try {
        const buffer = await readFile(path)
        manualFrames.push(`data:image/png;base64,${buffer.toString('base64')}`)
      } catch {
        break
      }
    }
    return { autoFrames, manualFrames }
  })

  // --- Seedance 2.0 IPC handlers ---
  ipcMain.handle('seedance2:create-task', async (_event, params) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    const info = extractContentInfo(params as Record<string, unknown>)
    try {
      const result = await arkFetch('/contents/generations/tasks', {
        method: 'POST',
        body: JSON.stringify(params)
      })
      insertLog({ version: '2.0', task_id: (result as Record<string, unknown>)?.id as string || null, operation: 'create', model: String((params as Record<string, unknown>).model || ''), prompt: info.prompt, status: null, image_count: info.imageCount, video_count: info.videoCount, audio_count: info.audioCount, params: JSON.stringify(params), result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '2.0', task_id: null, operation: 'create', model: String((params as Record<string, unknown>).model || ''), prompt: info.prompt, status: null, image_count: info.imageCount, video_count: info.videoCount, audio_count: info.audioCount, params: JSON.stringify(params), result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  ipcMain.handle('seedance2:get-task', async (_event, id: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    try {
      const result = await arkFetch(`/contents/generations/tasks/${encodeURIComponent(id)}`)
      insertLog({ version: '2.0', task_id: id, operation: 'get', model: (result as Record<string, unknown>)?.model as string || '', prompt: null, status: (result as Record<string, unknown>)?.status as string || null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '2.0', task_id: id, operation: 'get', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  ipcMain.handle('seedance2:list-tasks', async (_event, query: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    try {
      const result = await arkFetch(`/contents/generations/tasks${query}`)
      insertLog({ version: '2.0', task_id: null, operation: 'list', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: query, result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '2.0', task_id: null, operation: 'list', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: query, result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  ipcMain.handle('seedance2:delete-task', async (_event, id: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    try {
      const result = await arkFetch(`/contents/generations/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      insertLog({ version: '2.0', task_id: id, operation: 'delete', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: JSON.stringify(result), error: null })
      return result
    } catch (err) {
      insertLog({ version: '2.0', task_id: id, operation: 'delete', model: '', prompt: null, status: null, image_count: 0, video_count: 0, audio_count: 0, params: null, result: null, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })

  // --- Logs query IPC handler ---
  ipcMain.handle('logs:query', async (_event, options) => {
    return queryLogs(options)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
