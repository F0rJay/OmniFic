<!-- Modified by OmniFic contributors from OpenFic v0.7.5. -->
# OmniFic Frontend

React + Vite 前端，提供三栏写作工作区、世界书与角色管理、单项内容导出和 Agent 对话界面。

## 技术栈

- **React** 19
- **TypeScript** 5.9
- **Vite** + **vite-plus**
- **Radix UI Themes** — 组件库
- **TipTap / ProseMirror** — 写作编辑器
- **TanStack React Query** — 数据获取
- **Zustand** — 状态管理
- **React Router** — 路由
- **i18next** — 国际化
- **motion** — 动画
- **fuse.js** — 模糊搜索

## 项目结构

```
frontend/src/
├── features/
│   ├── app-shell/         # 应用壳（侧栏、状态栏、布局）
│   ├── assistant/         # Agent 对话界面 + / 命令中心
│   ├── writing/           # 卷章/笔记编辑、三栏布局与导出入口
│   ├── projects/          # 项目管理 + TXT 导入
│   ├── characters/        # 角色管理
│   ├── world-info/        # 世界书
│   ├── settings/          # 设置页
│   ├── prompt-chains/     # 提示词链
│   └── dashboard/         # 数据面板
├── components/            # 共享组件
├── lib/                   # 工具库、API 客户端、类型与导出格式
├── i18n/                  # 国际化
└── styles/                # 全局样式
```

## 快速开始

```bash
cd frontend
pnpm install
pnpm dev
```

默认运行在 `http://127.0.0.1:9000`。

## 脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm test` | Vitest 回归测试 |
| `pnpm type-check` | TypeScript 类型检查 |
| `pnpm lint` | 代码 lint |
| `pnpm format:check` | 格式化检查 |

## 路由

| 路径 | 页面 |
|---|---|
| `/` | 项目列表 |
| `/projects/:projectId` | 写作编辑器 |
| `/world-info` | 世界书管理 |
| `/characters` | 角色管理 |
| `/prompt-chains` | 提示词链 |
| `/dashboard` | 数据面板 |

## 国际化

中英双语。新增文案在 `src/i18n/locales/zh-CN.json` 和 `en.json` 中添加。
