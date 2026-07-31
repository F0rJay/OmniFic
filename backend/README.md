<!-- Modified by OmniFic contributors from OpenFic v0.7.5. -->
# OmniFic Backend

Python FastAPI 后端，提供 REST/SSE API、Agent Runtime、Socket.IO 实时事件、后台任务、检索和数据库管理。

## 技术栈

- **Python** 3.12+
- **FastAPI** — Web 框架
- **SQLAlchemy / SQLModel** — ORM + 数据库模型
- **SQLite** — 本地数据库
- **LangChain / LangGraph** — Agent 框架
- **ZeroMQ** — 后台任务通信
- **httpx** — HTTP 客户端
- **LanceDB / FastEmbed** — RAG 检索与嵌入

## 项目结构

```
backend/app/
├── api/routers/      # REST API 路由
├── agent_runtime/    # Agent 运行时（图、工具、上下文）
├── storage/          # 数据模型、仓库、服务与写作准备状态
├── models/           # LLM 客户端、提供商、目录
├── retrieval/        # 章节索引、语义检索与重排
├── background/       # 后台任务、ZeroMQ 传输与事件
├── memory/           # 章节摘要与提示词链运行
├── audit/            # LLM 与工具调用审计
├── macro/            # 提示词宏解析与编译
├── skills/           # Skill 加载
├── socket/           # Socket.IO 服务与事件处理
├── core/             # 工具函数（TXT 解析、文档解析、错误）
├── settings.py       # 应用配置
└── main.py           # 入口
```

## 深入文档

- [系统架构](../docs/architecture.md) — 前后端、Agent Runtime、存储与桌面端边界
- [上下文压缩机制](../docs/features/context-compaction.md) — 模型感知预算、摘要与应急策略、检查点和事件

## 快速开始

普通用户可以直接安装包含 Web 前端的 PyPI 包：

```bash
python -m pip install --upgrade omnific
omnific serve
```

源码开发：

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .
```

PyPI 包默认监听 `http://127.0.0.1:8000`，数据目录为 `~/.omnific`。完整发行渠道说明见[`docs/installation.md`](../docs/installation.md)。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `OMNIFIC_SERVER_HOST` | `127.0.0.1` | 监听地址 |
| `OMNIFIC_SERVER_PORT` | `8000` | 监听端口 |
| `OMNIFIC_DATA_DIR` | `backend/data` | 数据目录 |
| `OMNIFIC_FRONTEND_DIST` | `frontend/dist` | 前端构建产物路径 |

## 数据库迁移

```bash
alembic -c alembic.ini upgrade head
alembic -c alembic.ini revision --autogenerate -m "description"
alembic -c alembic.ini downgrade -1
```

## 测试

```bash
pytest
pytest tests/api/test_tasks.py -v
```

## API 路由

| 前缀 | 模块 |
|---|---|
| `/api/v1/projects` | 项目管理 |
| `/api/v1/projects/{project_id}/writing-readiness` | 首次正文写作准备状态 |
| `/api/v1/projects/{project_id}/volumes` | 卷管理 |
| `/api/v1/projects/{project_id}/chapters`, `/api/v1/chapters/{chapter_id}` | 章节管理 |
| `/api/v1/projects/{project_id}/notes`, `/api/v1/notes/{note_id}` | 笔记管理 |
| `/api/v1/characters` | 角色管理 |
| `/api/v1/world-info`, `/api/v1/projects/{project_id}/world-info` | 世界书与条目 |
| `/api/v1/models`, `/api/v1/model-providers` | 模型与供应商 |
| `/api/v1/settings` | 用户设置 |
| `/api/v1/prompt-chains` | 提示词链与版本 |
| `/api/v1/skills`, `/api/v1/agent-rules` | Skill 与规则 |
| `/api/v1/agent-definitions`, `/api/v1/agent-memories` | Agent 配置与记忆 |
| `/api/v1/agent`, `/api/v1/tasks` | Agent 会话与任务 |
| `/api/v1/import` | TXT 导入（SSE 进度） |
| `/api/v1/retrieval/index`, `/api/v1/projects/{project_id}/retrieval/index` | 章节检索索引 |
| `/api/v1/background`, `/api/v1/dashboard`, `/api/v1/audit-logs` | 后台任务、仪表盘与审计 |
