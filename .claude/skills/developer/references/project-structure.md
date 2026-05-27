# 项目目录结构

```
produce/
├── package.json
├── electron.vite.config.mjs
├── vite.config.js
├── jsconfig.json
├── components.json
├── electron-builder.yml
├── dev-app-update.yml
├── eslint.config.mjs
├── src/
│   ├── main/
│   │   └── index.js                 # 主进程：窗口创建、IPC handler、app 生命周期
│   ├── preload/
│   │   └── index.js                 # 预加载：contextBridge 暴露 API
│   └── renderer/
│       ├── index.html               # 渲染进程 HTML（含 CSP）
│       └── src/
│           ├── main.tsx             # React 入口
│           ├── App.tsx              # 根组件
│           ├── assets/
│           │   ├── main.css         # 全局样式（含 @import 'tailwindcss'）
│           │   └── base.css         # CSS 变量
│           ├── components/
│           │   ├── Versions.tsx
│           │   └── ui/
│           │       └── button.tsx   # shadcn Button
│           └── lib/
│               └── utils.js         # cn() 工具函数
├── out/              # 构建输出
├── dist/             # 打包输出
├── build/            # 构建资源
└── resources/        # 应用资源（图标等）
```
