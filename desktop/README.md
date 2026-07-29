# OmniFic Desktop

Electron 桌面应用，将 OmniFic 打包为原生 Windows 与 macOS 应用。Linux 构建配置仅保留给本地实验，不发布官方 Linux 桌面包；Linux 用户可使用 PyPI、Docker 或源码运行。

## 技术栈

- **Electron** — 桌面框架
- **electron-builder** — 打包发布
- **electron-updater** — 自动更新

## 快速开始

```bash
cd desktop
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
pnpm exec electron-builder --config electron-builder.yml --mac
pnpm exec electron-builder --config electron-builder.yml --win
pnpm exec electron-builder --config electron-builder.yml --linux
```

官方发布产物：

| 平台 | 架构 | 产物 |
|---|---|---|
| Windows | x86_64 / ARM64 | NSIS `setup.exe`、ZIP、更新 YAML |
| macOS | Intel / Apple Silicon | DMG、ZIP、`latest-mac.yml` |

ARM 桌面产物统一使用 `arm64` 命名；Docker 的 Linux 架构标签独立使用 `linux-aarch64`。

## 更新机制

Windows 安装包支持应用内更新。macOS 包使用 ad-hoc 签名以保证 App 包完整性，但尚未使用 Developer ID 签名或 Apple 公证，仅支持手动下载安装更新：Apple Silicon 下载 `mac-arm64`，Intel 下载 `mac-x86_64`；首次打开时请在 Finder 中按住 Control 点击 App 并选择“打开”。

后续启用 macOS 应用内更新时，需要将 `package.json` 中的 `omnificMacAutoUpdate` 设为 `true`，并在发布 CI 配置 Developer ID Application 证书、Hardened Runtime、entitlements 以及 Apple API Key 公证凭据。

## 候选包验证

GitHub Actions 的 `Desktop Release Candidate` 工作流会构建后端 wheel，并将其内置到 Windows/macOS 候选安装包。工作流仍会生成并校验完整桌面产物，但 Actions Artifacts 只上传 Windows `setup.exe` 或 macOS DMG，避免把安装包、ZIP、blockmap 和更新元数据重复打包成数百 MB 的候选下载。候选流程不会创建 GitHub Release，也不会发布 PyPI 或 GHCR；实机验证通过后再创建正式版本 tag。

## 卸载与数据清理

- Windows 安装版会注册系统卸载项，并生成 `Uninstall OmniFic.exe`；系统卸载默认保留 `%APPDATA%\omnific-desktop` 中的作品与配置。
- macOS 将 `/Applications/OmniFic.app` 移入废纸篓只删除应用本体，不会删除 `~/Library/Application Support/omnific-desktop` 中的作品、配置和运行环境。
- 彻底卸载前必须先备份创作数据，并单独清理用户数据目录及安装时选择的自定义 `runtime` 目录。

完整步骤见[安装与卸载指南](../docs/installation.md)。
