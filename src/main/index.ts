import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API_KEY = process.env['VITE_SEE_DANCE_API_KEY'] || ''

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

  // --- Seedance IPC handlers ---
  ipcMain.handle('seedance:create-task', async (_event, params) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    return arkFetch('/contents/generations/tasks', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  })

  ipcMain.handle('seedance:get-task', async (_event, id: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    return arkFetch(`/contents/generations/tasks/${encodeURIComponent(id)}`)
  })

  ipcMain.handle('seedance:list-tasks', async (_event, query: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    return arkFetch(`/contents/generations/tasks${query}`)
  })

  ipcMain.handle('seedance:delete-task', async (_event, id: string) => {
    if (!ARK_API_KEY) {
      throw new Error('请先配置 VITE_SEE_DANCE_API_KEY 环境变量')
    }
    return arkFetch(`/contents/generations/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
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
    const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
    return `data:image/${ext};base64,${buffer.toString('base64')}`
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
