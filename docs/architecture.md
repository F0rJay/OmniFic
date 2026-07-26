# OmniFic 系统架构

## 总览

```
┌─────────────────────────────────────────────┐
│                  OmniFic                     │
├───────────────┬─────────────┬───────────────┤
│   frontend/   │  backend/   │   desktop/    │
│  React + Vite │ FastAPI +   │   Electron    │
│   :9000       │ SQLite      │   打包发布     │
│               │  :8001      │               │
└───────────────┴─────────────┴───────────────┘
```

## 前端架构

```
main.tsx (QueryClientProvider + BrowserRouter)
  └── AppLayout (侧栏 + 状态栏 + 设置 Dialog)
        ├── ProjectsPage (/)
        ├── WritingPage (/projects/:id)
        │     ├── WritingSidebar (卷树 + 笔记)
        │     ├── ChapterEditor (TipTap 编辑器)
        │     └── AssistantSidebar (Agent 对话)
        ├── WorldInfoPage (/world-info)
        ├── CharactersPage (/characters)
        ├── DashboardPage (/dashboard)
        └── BookshelfPage (/bookshelf)
```

### 数据流

```
React Query (TanStack) → api-client.ts (Axios) → FastAPI REST
Zustand Store (UI 状态) → localStorage/IndexedDB → 本地持久化
Socket.IO → Agent 实时事件流
```

### 状态管理

- **服务端数据**：React Query（模型列表、设置、项目、章节）
- **UI 状态**：Zustand（编辑器 tab、世界书选择、搜索）
- **Agent 状态**：`useAgentSession` hook（消息、状态、token 使用）

## 后端架构

```
FastAPI Application
├── API Routers (REST + SSE)
│   ├── projects, chapters, volumes, notes
│   ├── characters, world-info
│   ├── models, model-providers, settings
│   ├── agent-runtime (会话 + WebSocket)
│   ├── import (TXT 文件导入)
│   └── bookshelf (书架搜索)
├── Agent Runtime
│   ├── Graph (LangGraph StateGraph)
│   ├── Tools (章节/笔记/角色/世界书 CRUD)
│   ├── Context (系统提示 + 规则 + 技能 + 目标 + 历史)
│   └── Runner (会话管理 + 事件流)
├── Storage Layer
│   ├── Models (SQLModel entities)
│   ├── Repos (数据访问)
│   └── Services (业务逻辑)
├── Background Workers (ZMQ)
│   ├── 任务标题生成
│   ├── 摘要生成
│   └── 索引管理
└── Reading Module (实验)
    ├── LLM Agent 搜索
    └── 网页代理抓取
```

### 数据库

SQLite + Alembic 迁移。核心表：`projects`, `volumes`, `chapters`, `characters`, `world_info`, `world_info_entries`, `notes`, `tasks`, `settings`, `models`, `model_providers`。

## 桌面架构

```
Electron Main Process
├── 启动 FastAPI 后端 (子进程)
├── 启动 Vite 开发服务器 / 静态文件服务
└── BrowserWindow 加载前端
```

使用 `electron-builder` 打包，`electron-updater` 自动更新。
