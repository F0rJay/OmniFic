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
pnpm build        # 构建前端
pnpm dist:mac     # 打包 macOS
pnpm dist:win     # 打包 Windows
pnpm dist:linux   # 打包 Linux
```

## 更新机制

使用 `electron-updater`，更新检查在 `src/updater.ts` 中配置。
