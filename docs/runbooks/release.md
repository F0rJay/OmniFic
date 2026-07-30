# 正式发布操作手册

> **状态**：Active · **代码范围**：Release Please、`Package`、`Release Audit` 与桌面更新器 · **审查日期**：2026-07-31 · **触发条件**：版本来源、发行渠道、签名、公证或 Release 正文生成方式变更

本手册说明 OmniFic 正式版本的版本同步、发行说明、打包和发布后审计。候选桌面包只用于实机验证，不创建正式 Release，也不发布 PyPI 或 GHCR。

## 发布前

1. 确认计划发布的改动已经按 Conventional Commits 提交，并完成与风险相称的后端、前端和桌面测试。
2. 使用 `Desktop Release Candidate` 构建 Windows x86_64/ARM64 与 macOS Intel/Apple Silicon 候选包，完成真机启动、安装和更新路径验证。
3. 确认 Release Please 版本提交同时更新：
   - `.release-please-manifest.json`
   - `backend/pyproject.toml`
   - `frontend/package.json`
   - `desktop/package.json`
   - `CHANGELOG.md`
4. 检查 `CHANGELOG.md` 中存在非空的当前版本段落。这里的用户可读条目同时是 GitHub Release 和桌面更新面板的主要数据源。
5. 运行文档、许可证、格式和打包前检查，确认工作区没有混入无关文件。

## 触发正式发布

推荐合并 Release Please 创建的版本 PR。Release Please 在 `main` 上维护版本提交和 tag；`v*` tag 会触发 `.github/workflows/package.yml`。

`Package` 工作流会：

- 读取 tag 并验证各包版本一致；
- 复用已存在的 GitHub Release；若 Release 不存在，则使用 `scripts/extract_release_notes.py` 从 `CHANGELOG.md` 提取当前版本段落创建；
- 构建前端与 Python wheel；
- 发布 PyPI 包和 Linux amd64/arm64 Docker 镜像；
- 构建并上传 Windows x86_64/ARM64 与 macOS Intel/Apple Silicon 桌面产物及更新元数据。

不要在已发布 tag 上重写历史。发布失败时先判断是否可以安全重跑对应工作流；任何需要替换 tag、删除包或撤回产物的操作都应单独评估。

## 发行说明与桌面更新

桌面更新器按以下顺序选择发行说明：

1. GitHub Release 正文；
2. 对应 tag 中 `CHANGELOG.md` 的同版本段落；
3. `electron-updater` 返回的发行说明。

客户端会过滤只有 GitHub compare URL 的 `Full Changelog` 行。Release 正文应使用简洁、面向用户的列表，不应只保留提交比较链接。

可在本地预检版本段落：

```bash
python3 scripts/extract_release_notes.py CHANGELOG.md 0.8.2
```

将示例版本替换为待发布版本。脚本在版本缺失或内容为空时返回失败，正式工作流也会因此停止创建空 Release。

## 发布后审计

1. 打开 GitHub Release，确认版本标题、正文和所有桌面产物齐全。
2. 确认 PyPI 可以安装精确版本并正常启动健康检查。
3. 确认 GHCR 的 amd64/arm64 镜像可以拉取、启动并通过健康检查。
4. 在 Windows x86_64/ARM64 验证更新检查、发行说明、下载、重启安装和版本变化。
5. 在 macOS Intel/Apple Silicon 验证 DMG、首次手动放行与本地后端启动；未启用 Developer ID 签名和公证前，不宣称支持应用内自动更新。
6. 必要时手动运行 `Release Audit`，输入刚发布的精确版本。

发布后不要仅依赖工作流绿色状态；PyPI、GHCR、GitHub Release 和桌面安装包属于独立交付面，必须分别确认。
