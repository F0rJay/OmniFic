![OmniFic：由翻动书页与数字字流构成的品牌横幅](./docs/assets/readme/omnific-hero.webp)

<h1 align="center">OmniFic</h1>

<p align="center">
  <strong>一份由真实创作体验推动的 AI 辅助长篇小说写作实验。</strong>
</p>

<p align="center">
  中文 · <a href="./README_EN.md">English</a>
</p>

<p align="center">
  <img alt="Apache 2.0 License" src="https://img.shields.io/badge/License-Apache_2.0-8B5CF6">
  <img alt="Python 3.12–3.13" src="https://img.shields.io/badge/Python-3.12%E2%80%933.13-22D3EE">
  <img alt="Based on OpenFic v0.7.5" src="https://img.shields.io/badge/Based_on-OpenFic_v0.7.5-070A12">
</p>

## 写在前面

> OmniFic 不是 OpenFic 的替代，也不是一个“更正确”的版本。它只是我在真实使用中，按照自己的写作习惯、模型接入方式和交互偏好做出的分支。

我很感谢 [OpenFic](https://github.com/syrizelink/OpenFic)。它提供了这个项目最重要的基础：世界观管理、写作编辑器、Agent Runtime、本地数据能力，以及一套让我愿意继续动手改造的完整产品形态。OmniFic 从 OpenFic v0.7.5 Fork，之后选择了独立发展。

做出这个决定，不是因为上游的方向有问题。恰恰相反，是因为我逐渐意识到，自己的许多改动带有很强的个人偏好：我使用中转站接入模型，习惯命令式的 Agent 交互，也特别在意长篇创作中的资料导入、任务连续性和推理过程。这些取舍未必适合每个人，也不应该要求原项目接受。

所以我把它作为一个独立项目公开。它首先服务于我自己的创作实践，也希望能用来分享实现、交流想法和共同学习。

## OmniFic 是什么

OmniFic 是一款本地运行的 AI 辅助长篇小说创作工具。它以 OpenFic v0.7.5 为基础，保留了项目、角色、世界书、章节编辑与 Agent 协作等核心能力，并围绕我自己的工作流继续实验。

项目由 Python 后端、React 前端和可选的 Electron 桌面壳组成。当前推荐入口是从源码在本地运行；系统结构与模块边界见[架构文档](./docs/architecture.md)。

## 我做出的取舍

这些不是对上游的功能评判，而是我在日常使用中选择优先解决的问题。

### 模型接入

- 将 OpenAI 兼容的中转站或 API 代理视为常用接入方式
- 支持从中转站发现模型，并按模型覆盖推理能力
- 在多个供应商、基础 URL 与能力声明之间提供更直接的配置路径

详见[中转站供应商](./docs/features/relay-provider.md)与[模型推理能力](./docs/features/model-reasoning.md)。

### Agent 交互

- 用 `/` 命令集中处理模型、推理、状态、目标和技能等会话操作
- 用 `@` 引用项目资料，让输入框更接近创作控制台
- 保留任务目标与运行状态，减少长会话中的上下文断裂感

详见[`/` 命令中心](./docs/features/codex-slash.md)与[任务目标](./docs/features/task-goal.md)。

### 资料导入

- 将 Markdown、PDF、Word、PPT 与 TXT 等资料整理为世界书候选内容
- 支持在导入阶段使用模型辅助整理
- 从小说 TXT 中识别卷章结构，降低旧稿迁移和资料重建的成本

详见[世界书导入](./docs/features/worldbook-import.md)与[TXT 分卷导入](./docs/features/txt-volume-import.md)。

### 长篇创作体验

- 更重视任务连续性、上下文管理和 Agent 推理状态
- 针对角色页、多人选择和长任务交互继续做小范围实验
- 优先解决我在真实写作中反复遇到的问题，而不是追求功能数量

## 它可能适合谁

它可能适合：

- 使用个人或团队中转站、OpenAI 兼容端点的人
- 喜欢 `/` 命令、`@` 引用和 Agent 式工作流的人
- 需要整理大量设定资料、旧稿或长篇小说结构的人
- 愿意本地部署、阅读文档，并接受实验性变化的人

它可能不适合：

- 希望下载安装后立即使用、无需配置的用户
- 需要稳定桌面安装包、云服务或长期版本支持的用户
- 希望项目持续同步 OpenFic，或保证与上游数据无损互迁的用户
- 希望产品路线以大众需求或社区投票为主导的用户

## 当前状态

OmniFic 目前由个人维护，处于实验性开发阶段。

- 项目从 OpenFic v0.7.5 分支而来，但不承诺继续同步上游
- 功能、交互与数据结构可能随着个人使用继续调整
- Issue、讨论和 PR 都很欢迎，但不代表相关需求一定会进入路线图
- 桌面版、PyPI 包和远程 Docker 镜像暂不作为稳定发行渠道
- 涉及数据库升级或从 OpenFic 迁移时，请先完整备份数据；目前不承诺直接复制数据即可无损迁移

## 快速开始

### 环境要求

- Python 3.12 或 3.13
- Node.js 22+
- pnpm 8+
- [uv](https://docs.astral.sh/uv/)

### 从源码运行

```bash
git clone https://github.com/F0rJay/OmniFic.git
cd OmniFic

# 终端 1：后端
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .
```

另开一个终端：

```bash
cd OmniFic/frontend
pnpm install
pnpm dev
```

前端默认运行在 `http://127.0.0.1:9000`，后端默认运行在 `http://127.0.0.1:8001`。

更完整的环境配置、数据库初始化和桌面端开发说明请阅读[开发环境搭建](./docs/develop/setup.md)。所有现有文档可从[文档导航](./docs/README.md)进入。

## 参与交流

公开这个项目的主要目的，是分享实践、交换想法和一起学习。你可以提交 [Issue](https://github.com/F0rJay/OmniFic/issues)、发起 [Pull Request](https://github.com/F0rJay/OmniFic/pulls)，或从[贡献指南](./CONTRIBUTING.md)了解基本约定。

如果你的想法没有被采用，也通常只是因为它与这个个人分支的取舍不同，并不意味着想法本身没有价值。

## 致谢

首先感谢 [OpenFic](https://github.com/syrizelink/OpenFic) 及其作者。OmniFic 的基础架构、主要产品形态和许多核心能力都来自 OpenFic；没有这项工作，就不会有这个分支。

其他启发来源包括：

- [SillyTavern](https://github.com/SillyTavern/SillyTavern)：世界书格式与生态参考
- [Claude Code](https://claude.ai/code)：命令式 Agent 交互参考
- [oh-story-claudecode](https://github.com/worldwonderer/oh-story-claudecode)：写作 Skill 参考

## 许可证

OmniFic 依据 [Apache License 2.0](./LICENSE) 开源。使用或分发时，也请保留上游项目要求的版权与许可证声明。
