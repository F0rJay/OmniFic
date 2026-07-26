# OmniFic

> 从 [OpenFic](https://github.com/syrizelink/OpenFic) v0.7.5 Fork 并独立发展的 AI 辅助长篇小说创作工具。

![License](https://img.shields.io/badge/License-Apache_2.0-red)
![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)
![Based on OpenFic](https://img.shields.io/badge/Based%20on-OpenFic%20v0.7.5-blue)

中文 | [English](./README_EN.md)

## 定位

**OmniFic Fork 自 OpenFic，现已作为独立项目发展，不再跟踪上游更新。**

OpenFic 是一款优秀的 AI Native 小说写作工具，提供了扎实的世界观管理、Agent 协作和本地持久化能力。在此基础上，OmniFic 选择了自己的发展方向——这些改进并非“通用功能请求”，而是一位重度用户在实际使用中遇到真实痛点后，自己动手优化的结果。

如果你满足以下条件，OmniFic 可能比 OpenFic 更适合你：

- 使用公司或个人的模型中转站/API 代理，而非直接对接官方 API
- 追求 Codex / Claude Code 级别的高效交互体验，希望用 `/` 完成一切操作
- 需要将 Markdown、PDF、Word 等格式的设定文档快速转为可用的世界书
- 创作百万字级长篇小说，对上下文管理、任务目标和 Agent 推理透明化有真实需求
- 不满足于“使用现有功能”，愿意自己动手优化工具的深度用户

## 相比 OpenFic 的核心差异

### 模型接入

| 能力 | OpenFic | OmniFic |
|---|---|---|
| 支持官方模型目录 | ✅ | ✅ |
| 支持任意 OpenAI 兼容中转站 | ⚠️ 有限 | ✅ 一级支持 |
| 中转站模型自动发现 | ❌ | ✅ 一键拉取全部模型 |
| 手动指定模型推理能力 | ❌ | ✅ 可按模型覆盖 |

中转站用户不需要再“碰运气”确认模型是否支持推理强度，也不需要在多个供应商页面之间反复切换对比。

### 交互体验

| 能力 | OpenFic | OmniFic |
|---|---|---|
| Agent 对话输入 | 普通文本框 | 支持 `@` 引用 + `/` 命令中心 |
| 技能选择 | 无快捷入口 | `/` 菜单 + 蓝色可视化 Skill Token |
| 会话配置 | 底部选择器分散 | `/推理` `/模型` 统一入口 |
| Agent 推理用时 | 无 | 实时显示，刷新/重连后仍可恢复 |
| 运行状态面板 | 头部摘要 | `/状态` 展示完整会话详情 |

输入框不再是“聊天框”，而是 Agent 的控制中心。

### 创作辅助

| 能力 | OpenFic | OmniFic |
|---|---|---|
| 世界书导入 | SillyTavern JSON | + Markdown / PDF / Word / PPT / TXT |
| AI 整理世界书 | ❌ | ✅ 导入时可 LLM 增强 |
| 小说 TXT 分卷导入 | ❌ | ✅ 自动识别卷-章结构 |
| 任务目标 | ❌ | ✅ 持久化目标，随上下文传递 |

### Agent 系统

| 能力 | OpenFic | OmniFic |
|---|---|---|
| 多选 Agent 提问 | ❌ | ✅ Checkbox 多选 |
| 角色页 Agent 助手 | ❌ | ✅ 三栏式 Agent 面板 |

## 产品架构

```
OmniFic
├── OpenFic v0.7.5 核心         ← 世界观管理 / Agent Runtime / RAG / 写作编辑器
├── 中转站/代理深度支持         ← 模型发现、能力覆盖、URL 优先策略
├── Codex 风格命令中心          ← /MCP /推理 /模型 /状态 /目标 /技能
├── 多格式世界书导入            ← MarkItDown 解析 + LLM 增强整理
├── 小说 TXT 智能导入           ← 分卷解析 + Volume 自动创建
└── 创作效率增强                ← 任务目标持久化 / 推理用时 / 多选交互
```

## 快速开始

> OmniFic 与 OpenFic 使用完全相同的技术栈和部署方式。

### 环境要求

- Python 3.12+
- Node.js 22+
- pnpm

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/F0rJay/OmniFic.git
cd OmniFic

# 后端
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .

# 前端
cd frontend
pnpm install
pnpm dev
```

前端默认运行在 `http://127.0.0.1:9000`，后端默认 `http://127.0.0.1:8001`。

### Docker

```bash
docker run -d -p 8000:8000 -v "omnific:/data" --name omnific ghcr.io/F0rJay/omnific:latest
```

## 从 OpenFic 迁移

如果你已有 OpenFic 的项目数据，直接复制数据目录即可：

```bash
cp -r ~/openfic-data ~/omnific-data
```

OmniFic 与 OpenFic 数据库 schema 向后兼容，新增字段均有默认值，已有数据无需转换。

## 致谢

本项目基于 [OpenFic](https://github.com/syrizelink/OpenFic)，感谢原作者的卓越工作。

OpenFic 的设计哲学——“让 Agent 适应你的写作流程，而非反之”——也是 OmniFic 的出发点。我们做的所有定制化改进，都是为了把这个理念推向更极致的方向。

其他灵感来源：

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) — 世界书格式参考
- [Claude Code](https://claude.ai/code) — `/` 命令交互范式
- [oh-story-claudecode](https://github.com/worldwonderer/oh-story-claudecode) — 内置写作 Skill 参考

## 许可证

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)

## 交流

欢迎对 AI 辅助小说创作有兴趣的朋友交流学习，提交 Issue 或直接联系。
