# OmniFic Desktop

Electron 桌面应用，将 OmniFic 打包为原生 macOS / Windows / Linux 应用。

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

## 更新机制

Windows 安装包支持应用内更新。macOS 包使用 ad-hoc 签名以保证 App 包完整性，但尚未使用 Developer ID 签名或 Apple 公证，仅支持手动下载安装更新：Apple Silicon 下载 `mac-aarch64`，Intel 下载 `mac-x86_64`；首次打开时请在 Finder 中按住 Control 点击 App 并选择“打开”。

后续启用 macOS 应用内更新时，需要将 `package.json` 中的 `omnificMacAutoUpdate` 设为 `true`，并在发布 CI 配置 Developer ID Application 证书、Hardened Runtime、entitlements 以及 Apple API Key 公证凭据。
