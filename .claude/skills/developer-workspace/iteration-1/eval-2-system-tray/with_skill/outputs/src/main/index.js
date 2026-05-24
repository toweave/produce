import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage
} from 'electron'
import { join, extname } from 'path'
import { readFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow = null
let tray = null

// Distinguish explicit quit from close-to-tray behavior
let isQuitting = false

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
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

  // Intercept close event: hide to tray instead of destroying the window
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  // Use the imported icon path (handles both dev and production via ?asset)
  const appIcon = nativeImage.createFromPath(icon)
  // Resize to a small size suitable for the system tray
  const trayIcon = appIcon.resize({ width: 16, height: 16 })

  // macOS: mark as a template image so it adapts to light/dark menu bar
  if (process.platform === 'darwin') {
    trayIcon.setTemplateImage(true)
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('produce')

  // Build the context menu with current window state
  updateTrayMenu()

  // On Windows: left-click on tray icon toggles window visibility
  tray.on('click', () => {
    toggleWindow()
  })
}

function updateTrayMenu() {
  const isVisible = mainWindow && mainWindow.isVisible()
  const contextMenu = Menu.buildFromTemplate([
    {
      // Show a dynamic label based on current window visibility
      label: isVisible ? '隐藏窗口' : '显示窗口',
      click: () => {
        toggleWindow()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

function toggleWindow() {
  if (!mainWindow) return

  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }

  // Refresh the tray menu so the label reflects the new state
  updateTrayMenu()
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

  // Get app version
  ipcMain.handle('get-app-version', () => app.getVersion())

  // Read file from disk (used by drag-and-drop)
  ipcMain.handle('read-file', async (_event, filePath) => {
    const ext = extname(filePath).toLowerCase()
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg']
    const fileName = filePath.split(/[/\\]/).pop()

    if (imageExts.includes(ext)) {
      const buffer = await readFile(filePath)
      const base64 = buffer.toString('base64')
      const mimeType =
        ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.jpg'
            ? 'image/jpeg'
            : `image/${ext.slice(1)}`
      return { type: 'image', content: `data:${mimeType};base64,${base64}`, fileName }
    }

    const content = await readFile(filePath, 'utf-8')
    return { type: 'text', content, fileName }
  })

  createWindow()
  createTray()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
})

// App stays alive in the system tray even when windows are closed/hidden
app.on('window-all-closed', () => {
  // Intentionally empty: the app runs in the tray on all platforms
})

// Allow proper quit via Cmd+Q (macOS) / Alt+F4 (Windows)
app.on('before-quit', () => {
  isQuitting = true
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
