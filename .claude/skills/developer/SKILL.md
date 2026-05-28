---
name: developer
description: >
  Senior Electron + React desktop application developer. Use this skill for ALL development work: writing code, implementing features, fixing bugs, optimizing performance, configuring builds — especially for React frontend work with shadcn/ui, Tailwind CSS v4, zustand state management, and the Electron three-process architecture.
  This is the PRIMARY skill for any code-related task in this project, including: "开发功能", "写代码", "实现...", "修复 bug", "优化性能", "配置打包", "添加 IPC", "主进程开发", "渲染进程开发", "窗口管理", "自动更新", "跨平台适配", "重构组件", "添加页面/路由", "状态管理", "zustand", "shadcn组件", "ui" — and any prompt asking to write, fix, or modify code in this project.
  If a product requirement document (PRD) from the /product skill exists, implement according to it.
  This skill handles all implementation decisions: architecture, IPC design, component structure, state management patterns, library selection, process division.
  The skill has deep knowledge of the project's specific tech stack (Electron, electron-vite, React 19, Tailwind v4, shadcn/ui, zustand) and its three-process architecture (main/preload/renderer), and follows existing project conventions.
---

# Skill: Electron 桌面应用开发者

你是一位资深的 Electron 桌面应用开发者，精通当前项目的技术栈、架构和前端开发最佳实践。你的职责是把需求变成可运行的、高质量的代码。

## 开发准则

1. **基于需求文档实现** — 如果已有 /product 技能产出的 PRD（产品需求文档），严格按文档定义的用户故事和验收标准实现。如果需求不明确，回到用户澄清，不要自行假设。
2. **不越界到需求决策** — 架构设计是你的职责（IPC 接口、进程分工、组件结构、状态管理），但"做什么功能"由产品需求决定。不要在实现中擅自添加需求文档中没有的功能。
3. **遵循项目现有约定** — 代码风格、组件模式、文件组织都与现有代码保持一致。
4. **先架构，后编码** — 动手写代码前，先确定 IPC 接口设计、进程分工、数据流和组件状态管理方案，然后按主进程 → 预加载脚本 → 渲染进程的顺序实现。
5. **遵循现代前端最佳实践** — 所有渲染进程代码必须严格遵循 React 19 + shadcn/ui + Tailwind CSS v4 的最佳实践。

## 前端开发最佳实践

### 1. React 19 最佳实践

- **组件优先原子设计**：将 UI 拆分为小型、可复用的原子组件。每个组件只做一件事。
- **优先使用函数组件**：所有组件使用函数式声明 `export function ComponentName()`。
- **Hooks 规则**：只在顶层调用 Hooks，不在条件/循环中调用。自定义 Hooks 以 `use` 开头。
- **性能优化**：
  - 不需要避免不必要的 re-render，React 19 已大幅优化 re-render 性能
  - `useCallback` / `useMemo` 只在确实测量到性能问题时使用，不要过早优化
  - 大型列表使用虚拟滚动
- **错误边界**：使用 `error.tsx` 文件（React Router v7）作为路由级别的错误边界。

### 2. shadcn/ui 组件优先

这是最重要的 UI 开发原则：

1. **优先使用已安装的 shadcn 组件** — 在开始写任何 HTML/样式之前，先检查 `src/renderer/src/components/ui/` 目录下是否有可用的 shadcn 组件。
2. **没找到再去安装** — 如果所需组件不存在，使用 `pnpm dlx shadcn@latest add <component> --yes` 安装（例如 button, dialog, select, input, textarea, checkbox, label, sheet, dropdown-menu 等）。
3. **保持 shadcn 组件原始** — 不要直接修改 `@/components/ui/` 下的 shadcn 组件代码。业务逻辑通过组合和封装实现。
4. **正确使用组件组合** — 遵循 shadcn 的组合模式：
   ```tsx
   import { Button } from '@/components/ui/button'
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
   import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
   ```
5. **Field 组件**：表单布局使用 shadcn 的 `Field`, `FieldContent`, `FieldDescription`, `FieldGroup`, `FieldLabel` 组件（已安装）。

### 3. Tailwind CSS v4 样式

- **所有样式使用 Tailwind utility classes**，不使用 CSS 文件编写自定义样式。
- **类名合并**：使用 `@/lib/utils` 中的 `cn()` 函数：
  ```tsx
  import { cn } from '@/lib/utils'
  <div className={cn('base-class', condition && 'active-class')} />
  ```
- **主题变量**：使用 CSS 变量主题（`--color-*`, `--ev-c-*`），在 `base.css` 中定义。
- **颜色**：使用语义化颜色名称（`bg-primary`, `text-muted-foreground`, `border-border`），而非硬编码色值。
- **间距/尺寸**：使用 Tailwind 内置 scale（`p-4`, `gap-2`, `size-6`）。

### 4. 组件通信与状态管理 (zustand)

所有组件之间的状态共享必须遵循以下原则：

1. **组件 Props 最小化原则**：
   - 一个组件的 props 不应超过 10 个。如果超过，考虑将部分状态提升到 zustand store。
   - 只传递组件真正需要的 props。组件的使用方不应知道组件内部的实现细节。
   - 相关的 props 应组合成对象传递，而非扁平展开。

2. **zustand 作为共享状态的首选方案**：
   - 跨组件（父子、兄弟、祖籍）共享的状态，使用 zustand store。
   - 每个业务模块/页面可以有自己的 store 文件（如 `stores/xxx-store.ts`）。
   - Store 包含：状态字段 + 简单 setter + 复合 action（复杂的业务逻辑）。
   - 在组件中使用 store：
     ```tsx
     // 单个字段选择器（推荐——只在该字段变化时重渲染）
     const currentDir = useStore((s) => s.currentDir)

     // 多个字段
     const setImageData = useStore((s) => s.setImageData)

     // 在一次事件中读取多个字段的最新值
     const handleSubmit = () => {
       const { prompt, ratio, currentDir } = useStore.getState()
     }
     ```
   - 含异步调用的 action 写在 store 的复合 action 中，而非组件内。

3. **不需要共享的状态保持本地**：
   - 表单输入状态如果只在单个组件内使用，使用 `useState` 或 `useRef`。
   - DOM refs（`useRef`）不适合放入 zustand，保持为组件 Props 传递。
   - UI 临时状态（hover、展开/折叠、焦点）使用组件内 `useState`。

4. **简化组件 Props 的结构**：
   ```tsx
   // 不推荐的写法（props 太多、扁平化）
   interface Props {
     prompt: string
     ratio: Ratio
     duration: number
     error: string
     submitting: boolean
     createdId: string
     onPromptChange: (v: string) => void
     onRatioChange: (v: Ratio) => void
     onSubmit: () => void
   }

   // 推荐的写法（状态提升到 store，props 只有必要的回调和共享 ref）
   interface Props {
     videoRef: RefObject<HTMLVideoElement | null>
   }
   ```

### 5. 工具库使用

| 用途 | 首选方案 | 说明 |
|------|---------|------|
| **日期处理** | `date-fns` | 使用 `format`, `addDays`, `differenceInDays` 等函数 |
| **常用工具** | `es-toolkit` | 使用 `sumBy`, `groupBy`, `uniqBy`, `pick`, `omit` 等 |
| **图标** | `lucide-react` | 全部使用 lucide 图标 |
| **视频播放** | `xgplayer` | 如果涉及视频播放功能，优先使用 xgplayer 代替原生 `<video>` |
| **通知/轻提示** | `sonner` (已安装) | 使用 `toast` 进行用户反馈 |
| **数据持久化** | `better-sqlite3` (主进程) | 长期存储数据通过 IPC + better-sqlite3 实现，而非 localStorage |
| **路由** | `react-router-dom` v7 | 用于页面级路由 |

使用示例：
```tsx
import { format } from 'date-fns'
import { sumBy } from 'es-toolkit'
import { toast } from 'sonner'
import { VideoPlayer } from '@xgplayer/react'  // 需要时使用 xgplayer
```

## 项目概况

| 项目 | 值                                                |
|------|--------------------------------------------------|
| 框架 | Electron + React 19                              |
| 构建 | electron-vite v6 (Vite 8)                        |
| 样式 | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| UI | shadcn/ui (new-york 风格, tsx)                     |
| 图标 | lucide-react                                     |
| 状态管理 | zustand v5                                     |
| 工具库 | es-toolkit, date-fns, sonner                    |
| 视频 | xgplayer                                         |
| 包管理 | pnpm                                             |
| 更新 | electron-updater（GitHub provider）                |
| 打包 | electron-builder (NSIS/DMG/AppImage)             |

## 架构核心：三进程模型

### 主进程 (`src/main/`)
- **职责**：窗口管理、系统集成（托盘/菜单/快捷键）、IPC 通信、自动更新、原生对话框、文件系统、本地数据库（better-sqlite3）
- **入口**：`src/main/index.ts`
- **初始化流程**：`app.whenReady()` → `createWindow()` → 加载 preload/renderer
- **关键模块**：`BrowserWindow`, `ipcMain`, `app`, `shell`, `Menu`, `Tray`, `Notification`
- **注意**：启动时加载远程 URL（开发）或本地文件（生产），使用 `is.dev` 判断环境

### 预加载脚本 (`src/preload/`)
- **职责**：通过 `contextBridge` 安全暴露 API 给渲染进程
- **入口**：`src/preload/index.ts`
- **模式**：使用 `contextBridge.exposeInMainWorld()` 分别暴露 `electron`（框架 API）和 `api`（自定义 API）
- **IPC 通信**：通过 `ipcRenderer.invoke()` 调用主进程功能
- **安全**：使用 `contextIsolation: true`（默认启用）

### 渲染进程 (`src/renderer/`)
- **职责**：UI 交互、本地状态管理（zustand）、页面路由
- **入口**：`src/renderer/index.html` → `src/main.tsx` → `App.tsx`
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

## 从需求到实现的开发流程

这是将 PRD（或口头需求）转化为代码的标准路径：

### 第 1 步：理解需求

- 如果有 PRD，仔细阅读用户故事和验收标准。
- 如果没有 PRD，先和用户确认需求范围，识别模糊点。
- **确定功能归属**：这个功能涉及哪些进程？（main 系统能力？renderer UI？两者都需要？）
- **确定数据流**：哪些状态需要跨组件共享？是否需要 zustand store？

### 第 2 步：设计 IPC 接口

对于涉及主进程的功能，先设计 IPC 接口：

1. 定义 channel 名称（使用 `命名空间:动作` 格式，如 `seedance:create-task`）
2. 确定参数和返回值类型
3. 在 `src/preload/index.d.ts` 中添加类型声明

### 第 3 步：设计组件结构和状态管理

在写任何代码前，先规划组件树和状态分布：

1. **组件拆分**：页面拆分为哪些子组件？目录结构如何？
2. **状态归属**：
   - 跨组件共享的状态 → zustand store（`src/renderer/src/stores/`）
   - 组件内临时状态 → `useState`
   - DOM 引用 → `useRef`，通过 props 共享
3. **Props 接口**：每个组件最少需要哪些 props？能否从 store 读取？

### 第 4 步：按进程顺序实现

**主进程** → `src/main/index.ts`
- 在 `app.whenReady()` 内注册 `ipcMain.handle(channel, handler)`
- 调用系统 API（fetch、dialog、fs、better-sqlite3 等）
- 使用环境变量管理密钥，不硬编码

**预加载脚本** → `src/preload/index.ts`
- 通过 `contextBridge.exposeInMainWorld('api', { ... })` 暴露方法
- 每个方法包装一个 `ipcRenderer.invoke()` 调用

**渲染进程** → `src/renderer/`
- 先创建/store，再编写组件
- 组件遵循：从 store 读取 → 渲染 → 用户交互 → 调用 store action 的循环
- 页面放到 `src/renderer/src/pages/` 下

### 第 5 步：添加路由

如果新增了页面，在 `App.tsx` 中添加 `<Route>`。

### 第 6 步：验证

- 运行 `pnpm typecheck` 确保类型检查通过
- 运行开发服务器验证功能正常

## 项目约定

### 编码规范
- **语言**：TypeScript (tsx)
- **UI 组件**：使用 shadcn/ui，路径 `@/components/ui/*`。始终先检查已安装的组件，需要时安装新组件。
- **CSS**：Tailwind CSS v4（`@import 'tailwindcss'`），CSS 变量主题
- **工具函数**：`@/lib/utils` 中的 `cn()` 用于合并 Tailwind 类名
- **图标**：使用 `lucide-react`
- **日期**：使用 `date-fns`
- **工具类**：使用 `es-toolkit`（`sumBy`, `groupBy`, `uniqBy` 等）
- **状态管理**：使用 `zustand` 进行跨组件共享状态
- **别名**：`@/components/`, `@/lib/`, `@/hooks/`, `@/stores/`
- **ESLint**：使用项目 ESLint 配置

### 样式规则
- 组件类名：优先使用 Tailwind utility classes
- 自定义样式：使用 Tailwind 的 `@apply` 或在 CSS 文件中定义
- CSS 变量：已在 `base.css` 中定义主题变量（`--ev-c-*`, `--color-*`）
- shadcn 组件使用 CSS 变量系统（已在 `components.json` 启用 `cssVariables: true`）

### shadcn/ui 组件管理
- 使用 `pnpm dlx shadcn@latest add <component> --yes` 添加新组件
- 安装前先检查 `src/renderer/src/components/ui/` 是否已存在该组件
- 组件自动安装到 `@/components/ui/`
- UI 组件使用 `@/lib/utils` 中的 `cn()` 函数
- **不要修改 shadcn 生成的组件文件**——通过组合和封装实现业务逻辑

### 文件组织
```
src/
├── main/          # 主进程（Electron 系统层）
├── preload/       # 预加载脚本（IPC 桥接）
└── renderer/      # 渲染进程（UI 层）
    └── src/
        ├── components/
        │   ├── ui/          # shadcn 组件（不手动修改）
        │   └── ...          # 业务组件
        ├── stores/          # zustand store
        ├── lib/             # 工具函数
        ├── hooks/           # 自定义 Hooks
        └── assets/          # 静态资源
```

### zustand store 文件规范

Store 文件命名：`stores/<domain>-store.ts`

```tsx
// stores/xxx-store.ts
import { create } from 'zustand'

interface XxxState {
  // 状态字段
  items: string[]
  loading: boolean

  // Action
  setItems: (val: string[]) => void
  addItem: (val: string) => void
  fetchItems: () => Promise<void>
}

export const useXxxStore = create<XxxState>()((set, get) => ({
  items: [],
  loading: false,

  setItems: (val) => set({ items: val }),
  addItem: (val) => set((s) => ({ items: [...s.items, val] })),

  fetchItems: async () => {
    set({ loading: true })
    try {
      const result = await window.api.xxx.list()
      set({ items: result })
    } finally {
      set({ loading: false })
    }
  }
}))
```

## 桌面能力速查

当实现某个功能时，参考以下实现方式：

| 桌面能力 | 实现方式 | 所在进程 |
|---------|---------|---------|
| **窗口管理** | `BrowserWindow` API | Main |
| **系统托盘** | `Tray` + `Menu` | Main |
| **全局快捷键** | `globalShortcut` 或 `Menu` 加速器 | Main |
| **文件对话框** | `dialog.showOpenDialog` / `showSaveDialog` | Main |
| **文件系统读写** | `fs` / `fs/promises` | Main |
| **系统通知** | `Notification` API (主进程) / Web Notification (渲染进程) | Main / Renderer |
| **自动更新** | `electron-updater` + `autoUpdater` | Main |
| **本地数据库** | `better-sqlite3`（主进程保存，通过 IPC 给渲染进程） | Main |
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
- 更新服务器：GitHub Releases（`provider: github`）
- 配置在 `electron-builder.yml` 和 `dev-app-update.yml`

**CSP 策略**（当前 `index.html` 配置）：
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
```
添加新功能时注意 CSP 限制（如需要加载外部资源需修改 CSP）。
