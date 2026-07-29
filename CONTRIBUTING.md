<!-- Modified by OmniFic contributors from OpenFic v0.7.5. -->
# Contributing to OmniFic

欢迎贡献！无论是报告 Bug、提出功能建议，还是提交代码，请先阅读本指南。

## 如何贡献

### 报告 Bug

使用 [Bug Report](https://github.com/F0rJay/OmniFic/issues/new?template=bug-report.yml) 模板，描述环境、复现步骤、日志截图。

### 提出功能需求

使用 [Feature Request](https://github.com/F0rJay/OmniFic/issues/new?template=feature-request.yml) 模板，描述场景和期望行为。

### 提交代码

#### 环境搭建

```bash
git clone https://github.com/F0rJay/OmniFic.git && cd OmniFic
cd backend && uv sync && cd ..
cd frontend && pnpm install && cd ..
```

详见 [开发环境搭建](docs/develop/setup.md)。

#### Commit 规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/)。

```
feat: 新增 / 命令中心
fix: 修复中转站 URL 被覆盖的问题
docs: 重写 README
```

详见 [提交规范](docs/develop/commit-conventions.md)。

#### 代码风格

- **后端**：`ruff check` + `ruff format`
- **前端**：`pnpm lint` + `pnpm format:check`

#### 测试

- 后端：`pytest`
- 前端：`pnpm test`（Vitest）+ `pnpm type-check`
- 桌面：`pnpm test:runtime-paths`

详见 [测试指南](docs/develop/testing.md)。

#### PR 流程

1. Fork 并创建功能分支
2. 编写代码和测试
3. 运行 lint + type-check + test
4. 使用 PR 模板提交

## 项目结构

```
OmniFic/
├── backend/          # Python FastAPI 后端
├── frontend/         # React + Vite 前端
├── desktop/          # Electron 桌面版
└── docs/             # 项目文档
```

## 许可证

除非贡献者明确另行声明，提交给本项目并意图纳入项目的贡献依照
[Apache License 2.0](LICENSE) 提供。修改继承自 OpenFic 的文件时必须保留文件顶部的
修改声明；新增或升级依赖、字体或其他第三方材料时，必须同步更新
[NOTICE](NOTICE)、[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) 与
[合规流程](COMPLIANCE.md)。
