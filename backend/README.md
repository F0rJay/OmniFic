<!-- Modified by OmniFic contributors from OpenFic v0.7.5. -->
# OmniFic Backend

Python FastAPI 后端，提供 REST API、Agent Runtime、WebSocket、数据库管理。

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
├── storage/          # 数据模型、仓库、服务
├── models/           # LLM 客户端、提供商、目录
├── reading/          # 书架搜索（实验性）
├── background/       # 后台任务（标题生成、摘要）
├── core/             # 工具函数（TXT 解析、文档解析、错误）
├── settings.py       # 应用配置
└── main.py           # 入口
```

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
| `/api/v1/characters` | 角色管理 |
| `/api/v1/world-info` | 世界书 |
| `/api/v1/models` | 模型管理 |
| `/api/v1/settings` | 用户设置 |
| `/api/v1/agent` | Agent 会话 |
| `/api/v1/import` | TXT 导入 |
| `/api/v1/bookshelf` | 书架搜索（实验） |
