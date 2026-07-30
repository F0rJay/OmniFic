# OmniFic 系统架构

## 总览

OmniFic 由共享同一套 Web 应用的三部分组成：

```
┌────────────────────────────────────────────────────────────┐
│                         OmniFic                             │
├──────────────────┬──────────────────┬──────────────────────┤
│ frontend/        │ backend/         │ desktop/             │
│ React + Vite     │ FastAPI          │ Electron             │
│ 浏览器界面       │ API + Agent      │ 本地运行与发行壳      │
└────────┬─────────┴────────┬─────────┴──────────┬───────────┘
         │ REST / SSE       │ Socket.IO         │ 管理后端子进程
         └──────────────────┴────────────────────┘
                              │
                    SQLite + 检索索引文件
```

- 源码开发时，前端默认运行在 `127.0.0.1:9000`，Vite 将请求代理到 `127.0.0.1:8001`。
- PyPI 和服务器发行版由 FastAPI 提供构建后的前端，默认监听 `127.0.0.1:8000`。
- 桌面版启动内置 Python 环境和 OmniFic 后端，再由 Electron 加载同一套前端。

## 前端架构

应用入口位于 `frontend/src/main.tsx`，负责加载运行时配置、设置、主题、国际化、实时连接和路由。

```
AppRoot
└── QueryClientProvider + Theme
    └── BrowserRouter
        └── AppLayout（应用侧栏、状态栏、设置 Dialog）
            ├── ProjectsPage       /
            ├── WritingPage        /projects/:projectId
            │   ├── WritingSidebar（卷、章节、笔记）
            │   ├── ChapterEditor / NoteEditor
            │   └── AssistantSidebar（Agent 会话）
            ├── WorldInfoPage      /world-info
            ├── CharactersPage     /characters
            ├── PromptChainsPage   /prompt-chains
            └── DashboardPage      /dashboard
```

前端按业务功能组织在 `frontend/src/features/`：

- `projects/`：项目管理、封面和 TXT 导入。
- `writing/`：卷章树、笔记树、单编辑区切换、内容导出、三栏布局与摘要维护。
- `assistant/`：Agent 会话、工具审批、计划、子 Agent 和 `/` 命令。
- `characters/`、`world-info/`：角色与世界书资料。
- `prompt-chains/`：提示词链编辑和版本管理。
- `dashboard/`：写作活动、模型调用和审计详情。
- `settings/`：外观、模型、检索、规则、技能、Agent 和权限设置。

### 数据流与状态

```
TanStack React Query ──> Axios API Client ──> FastAPI REST
导入流式响应       ──> SSE Parser        ──> 进度与结果
Agent/后台事件      <── Socket.IO         <── 后端事件发布
Zustand/组件状态    ──> localStorage/Dexie（需要持久化的客户端偏好）
```

- 服务端数据由 React Query 查询、缓存和失效刷新。
- 卷章选择、笔记草稿、三栏收起状态和页面交互状态由 feature 内的 Zustand store 或组件状态管理。
- Agent 会话由 `features/assistant/` 下的 hooks 和 Socket.IO 适配层组合管理。
- 语言、主题和部分会话偏好按用途写入 localStorage 或 Dexie；正文与主要业务数据仍以服务端 SQLite 为准。

## 后端架构

入口位于 `backend/app/main.py`。FastAPI 负责生命周期、REST/SSE API、静态资源和前端托管，外层 Socket.IO ASGI 应用负责实时事件。

```
FastAPI + Socket.IO ASGI Application
├── api/routers/             REST / SSE API
│   ├── 项目、卷、章、笔记、角色、世界书、导入
│   ├── 设置、模型、供应商目录、提示词链
│   ├── 技能、规则、记忆、Agent 定义
│   ├── Agent 会话、任务、章节上下文
│   ├── 项目写作准备状态与首次正文准入
│   ├── 检索索引、后台任务、仪表盘和审计
│   └── 健康检查、模型图标代理
├── agent_runtime/
│   ├── graph/               主 Agent 与编排图
│   ├── runner/              会话、子 Agent、检查点和运行注册
│   ├── context/             系统提示、规则、技能、目标、历史和压缩
│   ├── tools/               章节、笔记、世界书、写作准入、计划和编排工具
│   ├── persistence/         消息、压缩、计划、Agent 定义和子任务记录
│   └── streaming/           实时事件重放缓冲
├── storage/                 SQLModel 模型、仓库、服务和 Alembic 迁移
├── models/                  模型适配器、客户端、策略、目录和供应商服务
├── retrieval/               章节切块、Embedding、查询和 Rerank
├── background/              后台作业、ZeroMQ 传输和事件发布
├── memory/                  章节摘要与提示词链运行
├── audit/                   LLM/工具调用审计
├── macro/                   提示词宏解析与编译
├── skills/                  内置和导入 Skill 的加载
├── socket/                  Socket.IO 服务、房间和事件处理
└── core/                    存储路径、导入解析、加密和通用类型
```

### Agent 运行时

主 Agent 和可委派 Agent 基于 LangGraph 运行。一次会话大致经过：加载持久化消息与检查点、构建上下文、调用模型、执行带权限和审批元数据的工具、发布实时事件、持久化结果。长会话可以进行上下文压缩；子 Agent、计划和任务目标都具有独立持久化记录。模型切换同样会持久化为会话事件，使重新进入任务后仍能追溯模型变化。

新项目首次正文使用独立的写作准备状态。服务层检查世界书、主要角色和两级大纲，Auditor 的审查结果绑定这些资料的内容快照，当前用户回合授权再绑定消息修订。`write_chapter`、正文型 `edit_chapter` 与 Writer 委派共享前置门禁，防止主 Agent 在资料不足、审查过期或当前回合未明确授权时写入正文。项目存在章节后进入正常写作阶段；普通工具权限与执行审批始终独立生效。

Agent 和后台任务的状态更新通过 Socket.IO 推送。TXT 与世界书文档导入等请求使用 SSE 返回进度，普通资源操作使用 REST。

### 后台任务与检索

后台运行时以 ZeroMQ 在 API 进程和本地 worker 之间传递作业通知及事件，目前承载会话标题、章节摘要和摘要批处理等任务。检索模块维护章节切块与索引状态，使用 Embedding 模型召回内容，并可使用 Rerank 模型进行二次排序。

## 数据与持久化

主要业务数据使用 SQLite + SQLModel，并通过 Alembic 管理迁移。数据大致分为：

- 写作资料：项目、卷、章、章节摘要、笔记分类与笔记、角色、世界书及条目。
- Agent 数据：任务与消息、运行消息、上下文压缩、计划、Agent 定义、子任务、请求与项目写作准备状态。
- 配置能力：设置、模型供应商、模型、提示词链及版本、规则、技能和参考文档、Agent 记忆。
- 运行记录：后台作业及事件、写作活动、检索索引状态、LLM 审计日志。
- 版本记录：提交、修订以及章节、笔记、角色和世界书的修订快照。

LangGraph 检查点和章节检索索引使用各自的本地持久化文件；封面与角色图片保存在数据目录中。具体路径由运行方式和 `OMNIFIC_DATA_DIR` 决定。

## 桌面架构

```
Electron Main Process
├── app:// 自定义协议提供安装界面、前端宿主与静态资源
├── 便携 Python + 同版本 OmniFic wheel
├── FastAPI 本地后端子进程、端口分配与健康检查
├── BrowserWindow 加载前端并代理 API / Socket.IO 请求
├── preload 与 IPC 提供受控的桌面能力
├── 启动、安装、协议、代理和更新诊断日志
└── Windows 自动更新 / macOS 手动更新提示
```

桌面安装包由 `electron-builder` 构建。官方矩阵包含 Windows x86_64/ARM64 与 macOS Intel/Apple Silicon，不发布 Linux 桌面安装包；Linux amd64/arm64 的 Docker 镜像是独立的服务器发行渠道。

Windows 使用 NSIS 安装器和 `electron-updater`。更新器优先读取 GitHub Release 正文，并以对应 tag 的 `CHANGELOG.md` 版本段落和更新元数据作为兜底；客户端会过滤只有 compare URL 的 `Full Changelog`。当前 macOS 包生成 DMG 与 ZIP，使用 ad-hoc 签名但尚未 Apple 公证，因此仅支持手动下载安装更新。

---

> **状态**：Active · **代码范围**：全项目 · **审查日期**：2026-07-31 · **触发条件**：新增路由、新增模块、持久化或桌面运行架构变更
