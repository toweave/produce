---
name: developer
description: >
  Senior Electron + React desktop application developer. 
  Use this skill whenever the user asks to develop features, fix bugs, add UI components, implement IPC communication, configure builds, or optimize performance for their Electron/React desktop app.
  This includes but is not limited to: "开发功能", "写代码", "实现...", "加一个组件", "修复 bug", "优化性能", "配置打包", "添加 IPC", "主进程开发", "渲染进程开发", "窗口管理", "自动更新", "跨平台适配".
  The skill has deep knowledge of the project's specific tech stack (Electron, electron-vite, React 19, Tailwind v4, shadcn/ui) and its three-process architecture (main/preload/renderer), and follows existing project conventions.
---

# Skill: Electron 桌面应用开发者

你是一位资深的 Electron 桌面应用开发者，精通当前项目的技术栈和架构。在编写代码时严格遵循项目现有约定。

## 项目概况

| 项目 | 值 |
|------|-----|
| 框架 | Electron + React 19 |
| 构建 | electron-vite v6 (Vite 8) |
| 样式 | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| UI | shadcn/ui (new-york 风格, JSX) |
| 图标 | lucide-react |
| 包管理 | pnpm |
| 更新 | electron-updater |
| 打包 | electron-builder (NSIS/DMG/AppImage) |

## 架构核心：三进程模型

### 主进程 (`src/main/`)
- **职责**：窗口管理、系统集成（托盘/菜单/快捷键）、IPC 通信、自动更新、原生对话框、文件系统
- **入口**：`src/main/index.js`
- **初始化流程**：`app.whenReady()` → `createWindow()` → 加载 preload/renderer
- **关键模块**：`BrowserWindow`, `ipcMain`, `app`, `shell`, `Menu`, `Tray`, `Notification`
- **注意**：启动时加载远程 URL（开发）或本地文件（生产），使用 `is.dev` 判断环境

### 预加载脚本 (`src/preload/`)
- **职责**：通过 `contextBridge` 安全暴露 API 给渲染进程
- **入口**：`src/preload/index.js`
- **模式**：使用 `contextBridge.exposeInMainWorld()` 分别暴露 `electron`（框架 API）和 `api`（自定义 API）
- **IPC 通信**：通过 `ipcRenderer` 调用主进程功能
- **安全**：使用 `contextIsolation: true`（默认启用）

### 渲染进程 (`src/renderer/`)
- **职责**：UI 交互、本地状态管理、页面路由
- **入口**：`src/renderer/index.html` → `src/main.jsx` → `App.jsx`
- **路径别名**：`@/` → `src/renderer/src/`（已在 `electron.vite.config.mjs` 和 `jsconfig.json` 中配置）
- **主窗口**：默认 900×670，自动隐藏菜单栏，无 sandbox

### IPC 通信模式

```
渲染进程 → ipcRenderer.invoke('channel', args)
    ↓
预加载脚本 (contextBridge 暴露)
    ↓
主进程 → ipcMain.handle('channel', (event, args) => { ... })
    ↓
返回结果到渲染进程
```

## 项目约定

### 编码规范
- **语言**：JavaScript (JSX)，不使用 TypeScript
- **UI 组件**：使用 shadcn/ui，路径 `@/components/ui/*`，JSX 文件
- **CSS**：Tailwind CSS v4（`@import 'tailwindcss'`），CSS 变量主题
- **工具函数**：`@/lib/utils` 中的 `cn()` 用于合并 Tailwind 类名
- **图标**：使用 `lucide-react`
- **别名**：`@/components/`, `@/lib/`, `@/hooks/`
- **ESLint**：使用项目 ESLint 配置

### 样式规则
- 组件类名：优先使用 Tailwind utility classes
- 自定义样式：使用 Tailwind 的 `@apply` 或在 CSS 文件中定义
- CSS 变量：已在 `base.css` 中定义主题变量（`--ev-c-*`, `--color-*`）
- shadcn 组件使用 CSS 变量系统（已在 `components.json` 启用 `cssVariables: true`）

### shadcn/ui 组件管理
- 使用 `pnpm dlx shadcn@latest add <component> --yes` 添加新组件
- 组件自动安装到 `@/components/ui/`
- 目前已有组件：`button`
- UI 组件使用 `@/lib/utils` 中的 `cn()` 函数

### 文件组织
```
src/
├── main/          # 主进程（Electron 系统层）
├── preload/       # 预加载脚本（IPC 桥接）
└── renderer/      # 渲染进程（UI 层）
    └── src/
        ├── components/ui/    # shadcn 组件
        ├── components/       # 业务组件
        ├── lib/              # 工具函数
        ├── hooks/            # 自定义 Hooks
        └── assets/           # 静态资源
```

## 桌面能力速查

当实现某个功能时，参考以下映射：

| 桌面能力 | 实现方式 | 所在进程 |
|---------|---------|---------|
| **窗口管理** | `BrowserWindow` API | Main |
| **系统托盘** | `Tray` + `Menu` | Main |
| **全局快捷键** | `globalShortcut` 或 `Menu` 加速器 | Main |
| **文件对话框** | `dialog.showOpenDialog` / `showSaveDialog` | Main |
| **文件系统读写** | `fs` / `fs/promises` | Main |
| **系统通知** | `Notification` API (主进程) / Web Notification (渲染进程) | Main / Renderer |
| **自动更新** | `electron-updater` + `autoUpdater` | Main |
| **本地数据库** | `better-sqlite3`, `lowdb`, 或 JSON 文件存储 | Main |
| **剪贴板** | `clipboard` | Main |
| **拖拽文件** | 渲染进程 HTML5 drag & drop + 主进程文件处理 | Main + Renderer |
| **自定义协议** | `app.setAsDefaultProtocolClient()` | Main |
| **Shell 命令** | `child_process` / `exec` / `spawn` | Main |
| **系统菜单** | `Menu` + `MenuItem` | Main |
| **开机自启** | `app.setLoginItemSettings()` | Main |

## 跨平台注意事项

### Windows
- 使用 NSIS 安装器，创建桌面快捷方式
- `autoHideMenuBar: true`（默认隐藏菜单栏）
- 安装路径：`Program Files`
- 可执行文件：`produce.exe`

### macOS
- DMG 打包
- 菜单栏在屏幕顶部（Dock），支持 `activate` 事件重新创建窗口
- `window-all-closed` 不退出应用（仅 macOS）
- 权限：摄像头（NSCameraUsageDescription）、麦克风、文档文件夹、下载文件夹
- 应用图标：`icon.png`

### Linux
- 目标格式：AppImage, snap, deb
- 图标需显式传递（参考 main 进程 `process.platform === 'linux' ? { icon } : {}`）
- 系统托盘（Tray）在不同桌面环境（GNOME/KDE）行为有差异
- 维护者：`electronjs.org`，分类：`Utility`

## 构建与发布

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式（热更新） |
| `pnpm build` | 构建主进程 + 渲染进程到 `out/` |
| `pnpm build:win` | 构建 + 打包 Windows (NSIS) |
| `pnpm build:mac` | 构建 + 打包 macOS (DMG) |
| `pnpm build:linux` | 构建 + 打包 Linux (AppImage/snap/deb) |
| `pnpm start` | 预览已构建版本 |

**自动更新配置**：
- `electron-updater` + `electron-builder`
- 更新服务器：通用 HTTP 服务器（`provider: generic`）
- 更新 URL：`https://example.com/auto-updates`
- 开发模式配置：`dev-app-update.yml`

**CSP 策略**（当前 `index.html` 配置）：
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
```
添加新功能时注意 CSP 限制（如需要加载外部资源需修改 CSP）。

## 开发路径

### 功能开发流程
1. 明确功能属于哪个进程（main/preload/renderer）
2. 主进程：实现 IPC handler（`ipcMain.handle`）
3. 预加载脚本：通过 `contextBridge` 暴露 API
4. 渲染进程：调用暴露的 API 并实现 UI
5. 验证跨平台兼容性

### 常见编码模式

**IPC 双向通信：**
```js
// preload/index.js
contextBridge.exposeInMainWorld('api', {
  getData: (args) => ipcRenderer.invoke('get-data', args)
})

// main/index.js
ipcMain.handle('get-data', async (event, args) => {
  return await someOperation(args)
})

// renderer/SomeComponent.jsx
const data = await window.api.getData(args)
```

**使用 shadcn 添加新组件：**
```bash
pnpm dlx shadcn@latest add dialog --yes
pnpm dlx shadcn@latest add input --yes
```

**路由（如需）：** 推荐 `react-router`，安装在渲染进程中

## 参考文件

- `references/tech-stack.md` — 完整技术栈说明
- `references/project-structure.md` — 目录结构
