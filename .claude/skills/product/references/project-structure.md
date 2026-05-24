# 项目目录结构

```
produce/
├── package.json                      # 项目配置与依赖
├── electron.vite.config.mjs         # electron-vite 构建配置
├── vite.config.js                   # Vite 配置（备用的 vite 配置）
├── jsconfig.json                    # JS 路径别名配置 (@/ → src/renderer/src/)
├── components.json                  # shadcn/ui 组件配置
├── electron-builder.yml             # electron-builder 打包配置
├── dev-app-update.yml               # 开发环境自动更新配置
├── eslint.config.mjs                # ESLint 配置
├── src/
│   ├── main/
│   │   └── index.js                 # 主进程入口
│   ├── preload/
│   │   └── index.js                 # 预加载脚本（contextBridge）
│   └── renderer/
│       ├── index.html               # 渲染进程 HTML
│       └── src/
│           ├── main.jsx             # React 入口
│           ├── App.jsx              # 根组件
│           ├── assets/
│           │   ├── main.css         # 全局样式（含 Tailwind @import）
│           │   └── base.css         # CSS 变量与基础样式
│           ├── components/
│           │   ├── Versions.jsx     # 版本显示组件
│           │   └── ui/
│           │       └── button.jsx   # shadcn Button 组件
│           └── lib/
│               └── utils.js         # cn() 工具函数
├── out/                              # 构建输出
├── dist/                             # 打包输出
├── build/                            # 构建资源
└── resources/                        # 应用资源
```
