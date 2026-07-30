# OmniFic 文档导航

> 最后更新：2026-07-31

## 当前状态

| 文档 | 状态 | 说明 |
|---|---|---|
| `README.md` | ✅ Active | 项目总览（中文） |
| `README_EN.md` | ✅ Active | 项目总览（英文） |
| `CONTRIBUTING.md` | ✅ Active | 贡献指南 |
| `CHANGELOG.md` | ✅ Active | 用户面变更日志 |
| `docs/installation.md` | ✅ Active | 安装、更新、备份与卸载 |
| `docs/installation_EN.md` | ✅ Active | Installation, updates, backups, and removal |
| `docs/user-guide.md` | ✅ Active | 产品使用指南（中文） |
| `docs/user-guide_EN.md` | ✅ Active | Product user guide (English) |
| `CLAUDE.md` | ✅ Active | AI Agent 项目指导 |
| `docs/architecture.md` | ✅ Active | 系统架构 |
| `docs/glossary.md` | ✅ Active | 术语合约 |
| `docs/features/*` | ✅ Active | 功能文档 |
| `docs/develop/*` | ✅ Active | 开发指南 |
| `docs/runbooks/*` | ✅ Active | 开发与发布操作手册 |
| `docs/index.html` | ✅ Active | GitHub Pages 官网 |

## 按目标阅读

### 首次接触

1. `README.md` — 项目是什么、解决什么问题
2. `docs/installation.md` — 如何安装、更新、备份与卸载
3. `docs/user-guide.md` — 如何配置和使用各项产品功能
4. `docs/architecture.md` — 怎么搭的
5. `docs/glossary.md` — 术语定义

### 想改代码

1. `CONTRIBUTING.md` — 提交规范和流程
2. `docs/develop/setup.md` — 环境搭建
3. `docs/develop/testing.md` — 测试指南
4. `docs/features/` — 对应功能的实现说明

### 想部署

1. `docs/installation.md` — 桌面、PyPI、Docker 与源码运行
2. `backend/README.md` — 后端启动
3. `frontend/README.md` — 前端构建
4. `desktop/README.md` — 桌面打包
5. `docs/runbooks/release.md` — 正式发布与更新日志数据源

### 维护文档

1. 本文件 — 文档索引
2. `docs/glossary.md` — 术语新增/变更流程
3. 功能文档或架构文档中的审查元数据

## 文档约定

- **状态标注**：统一在本索引维护；历史材料明确标记 `Archived`
- **元数据**：架构与功能实现文档包含代码范围、审查日期和触发条件；用户指南使用“最后更新 / 适用版本”
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
| `installation.md` | 安装、更新、备份与卸载 |
| `installation_EN.md` | Installation, updates, backups, and removal |
| `user-guide.md` | 从首次配置到完整创作工作流的中文使用指南 |
| `user-guide_EN.md` | English guide to setup and the complete writing workflow |
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
| `features/content-export.md` | 章节、笔记、世界书条目与角色卡导出 |
| `features/writing-readiness.md` | 首次正文写作准入、审查与当前回合授权 |

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
| `runbooks/release.md` | 正式发布、发行说明与发布后审计 |
