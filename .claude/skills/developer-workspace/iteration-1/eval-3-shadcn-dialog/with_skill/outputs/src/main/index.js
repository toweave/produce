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

// Prevent the app from being quit automatically (important for tray apps)
let preventQuit = false

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

  // --- Tray minimize-on-close behavior ---
  // When the window is closed, hide it to tray instead of destroying it
  mainWindow.on('close', (event) => {
    if (!preventQuit) {
      event.preventDefault()
      mainWindow.hide()
    }
    // If preventQuit is true, allow the window to close normally (app quitting)
  })
}

function createTray() {
  // Use the app icon for the tray
  // On macOS, use a 16x16 or 22x22 template image for best results
  const trayIcon = nativeImage.createFromPath(
    join(__dirname, '../../resources/icon.png')
  )
  // Resize to a smaller size suitable for tray
  const resizedIcon = trayIcon.resize({ width: 16, height: 16 })

  tray = new Tray(resizedIcon)
  tray.setToolTip('produce')

  // Build the context menu
  updateTrayMenu()

  // On Windows, left-click on tray icon toggles window visibility
  tray.on('click', () => {
    toggleWindow()
  })
}

function updateTrayMenu() {
  const isVisible = mainWindow && mainWindow.isVisible()
  const contextMenu = Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide' : 'Show',
      click: () => {
        toggleWindow()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        preventQuit = true
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

  // Update the tray menu to reflect the new state
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

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    preventQuit = true
    app.quit()
  }
})
