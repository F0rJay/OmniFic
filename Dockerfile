# syntax=docker/dockerfile:1
# Modified by OmniFic contributors from OpenFic v0.7.5.

# ---- 前端构建：固定到构建平台（amd64）一次构建，产物与架构无关 ----
FROM --platform=$BUILDPLATFORM node:22.18.0-slim AS frontend
WORKDIR /build
RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY frontend/ ./
RUN pnpm build

# ---- 后端运行：按目标平台构建（amd64 / arm64）----
FROM python:3.12.11-slim-bookworm AS backend

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

COPY --from=ghcr.io/astral-sh/uv:0.11.32 /uv /uvx /bin/

WORKDIR /app

# Legal notices for OmniFic, its Apache-2.0 upstream, dependencies, and fonts.
COPY LICENSE NOTICE THIRD_PARTY_NOTICES ./legal/
COPY third_party/fonts ./legal/fonts

# 先装依赖（利用层缓存）
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,id=uv-cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# 复制后端源码
COPY backend/ ./

# 前端构建产物打入包内
COPY --from=frontend /build/dist ./app/frontend_dist

ENV OMNIFIC_FRONTEND_DIST=/app/app/frontend_dist \
    OMNIFIC_DATA_DIR=/data

RUN mkdir -p /data

EXPOSE 8000

CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
