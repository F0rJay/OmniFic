# 开发环境搭建

## 系统要求

- **Python** 3.12+
- **Node.js** 22+
- **pnpm** 8+
- **uv** (Python 包管理器)

## 1. 克隆仓库

```bash
git clone https://github.com/F0rJay/OmniFic.git
cd OmniFic
```

## 2. 后端

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .
```

健康检查：`curl http://127.0.0.1:8001/api/v1/health`

### 数据库初始化

```bash
alembic -c alembic.ini upgrade head
```

数据库文件位于 `backend/data/omnific.db`。

### 常用命令

```bash
ruff check .          # lint
ruff format .         # 格式化
pytest                # 运行测试
pytest tests/api/ -v  # 运行 API 测试
```

## 3. 前端

```bash
cd frontend
pnpm install
pnpm dev
```

默认运行在 `http://127.0.0.1:9000`。

Vite 代理配置在 `vite.config.ts` 中，API 请求自动转发到 `http://127.0.0.1:8001`。

### 常用命令

```bash
pnpm type-check       # TypeScript 类型检查
pnpm lint             # 代码 lint
pnpm format:check     # 格式化检查
pnpm format           # 自动格式化
pnpm build            # 生产构建
```

## 4. 桌面

```bash
cd desktop
pnpm install
pnpm dev
```

需要先构建前端：`cd frontend && pnpm build`。

## 代理配置

如果使用清华 PyPI 镜像加速 Python 包安装：

```bash
UV_DEFAULT_INDEX="https://pypi.tuna.tsinghua.edu.cn/simple" uv sync
```
