# 本地开发重启

## 前提

- 后端跑在 8001，前端跑在 9000
- Python venv 在 `backend/.venv/`

## 重启后端

```bash
# 杀掉旧进程
lsof -tiTCP:8001 -sTCP:LISTEN | xargs kill

# 启动新后端
cd backend
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .
```

验证：`curl http://127.0.0.1:8001/api/v1/health`

## 重启前端

```bash
# 杀掉旧进程
lsof -tiTCP:9000 -sTCP:LISTEN | xargs kill

# 启动新前端
cd frontend
pnpm dev --port 9000
```

验证：浏览器打开 `http://127.0.0.1:9000`

## 数据库迁移

```bash
cd backend
alembic -c alembic.ini upgrade head
```

验证：`alembic -c alembic.ini current`

## 常见问题

| 症状 | 排查 |
|---|---|
| 前端白屏 | 检查 Vite 控制台是否有编译错误；是否有残留的路由引用 |
| 后端 500 | `tail -20` 最新的 backend 输出日志 |
| 端口被占 | `lsof -tiTCP:{port} -sTCP:LISTEN` 查是哪个进程 |
