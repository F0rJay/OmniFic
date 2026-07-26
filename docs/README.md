# OmniFic 文档导航

> 最后更新：2026-07-27

## 当前状态

| 文档 | 状态 | 说明 |
|---|---|---|
| `README.md` | ✅ Active | 项目总览（中文） |
| `README_EN.md` | ✅ Active | 项目总览（英文） |
| `CONTRIBUTING.md` | ✅ Active | 贡献指南 |
| `CHANGELOG.md` | ✅ Active | 用户面变更日志 |
| `CLAUDE.md` | ✅ Active | AI Agent 项目指导 |
| `docs/architecture.md` | ✅ Active | 系统架构 |
| `docs/glossary.md` | ✅ Active | 术语合约 |
| `docs/features/*` | ✅ Active | 功能文档 |
| `docs/develop/*` | ✅ Active | 开发指南 |

## 按目标阅读

### 首次接触

1. `README.md` — 项目是什么、解决什么问题
2. `docs/architecture.md` — 怎么搭的
3. `docs/glossary.md` — 术语定义

### 想改代码

1. `CONTRIBUTING.md` — 提交规范和流程
2. `docs/develop/setup.md` — 环境搭建
3. `docs/develop/testing.md` — 测试指南
4. `docs/features/` — 对应功能的实现说明

### 想部署

1. `backend/README.md` — 后端启动
2. `frontend/README.md` — 前端构建
3. `desktop/README.md` — 桌面打包

### 维护文档

1. 本文件 — 文档索引
2. `docs/glossary.md` — 术语新增/变更流程
3. 每个文档底部的元数据块

## 文档约定

- **状态标注**：每份文档开头声明 `Active / In Progress / Superseded`
- **元数据**：关键文档底部包含代码范围 + 审查日期 + 触发条件
- **交叉引用**：使用相对路径链接，不重新定义已有术语
- **术语**：统一使用 `docs/glossary.md` 中的定义

## 索引

### 项目级

| 文档 | 说明 |
|---|---|
| `../README.md` | 项目总览 |
| `../CONTRIBUTING.md` | 贡献指南 |
| `../CHANGELOG.md` | 变更日志 |
| `../CLAUDE.md` | AI Agent 指导 |
| `architecture.md` | 系统架构 |
| `glossary.md` | 术语定义 |

### 功能文档

| 文档 | 说明 |
|---|---|
| `features/codex-slash.md` | `/` 命令中心 |
| `features/task-goal.md` | 任务目标持久化 |
| `features/model-reasoning.md` | 模型推理覆盖 |
| `features/relay-provider.md` | 中转站供应商 |
| `features/worldbook-import.md` | 世界书导入 |
| `features/txt-volume-import.md` | TXT 分卷导入 |

### 开发指南

| 文档 | 说明 |
|---|---|
| `develop/commit-conventions.md` | 提交规范 |
| `develop/setup.md` | 环境搭建 |
| `develop/testing.md` | 测试指南 |

### 运维操作

| 文档 | 说明 |
|---|---|
| `runbooks/local-dev-restart.md` | 本地开发重启 |
| `runbooks/migration-apply.md` | 数据库迁移 |
