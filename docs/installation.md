# OmniFic 安装、更新与卸载

> 最后更新：2026-07-31 · 适用于 OmniFic 0.8.2

OmniFic 提供桌面应用、PyPI、Docker 和源码运行四种使用方式。Windows 与 macOS 是官方桌面发行平台；Linux 不发布桌面安装包，但可以使用 PyPI、Docker 或源码运行。

安装并成功启动后，请继续阅读[使用指南](./user-guide.md)，完成模型配置、项目创建以及写作与 Agent 工作流设置。

## 选择安装方式

| 方式 | 适合场景 | 包含内容 |
|---|---|---|
| Windows/macOS 桌面包 | 希望直接安装和启动 | Electron 客户端、同版本后端 wheel、便携 Python 运行环境安装器 |
| `pip install omnific` | 希望使用浏览器界面或自行管理 Python | Python 后端、CLI、编译后的 Web 前端；不包含 Electron 客户端 |
| Docker | 服务器、NAS、容器环境 | Linux amd64/arm64 后端与 Web 前端镜像 |
| 源码运行 | 开发、调试和贡献代码 | 前端、后端与桌面端全部源码 |

## Windows 桌面版

从 [GitHub Releases](https://github.com/F0rJay/OmniFic/releases/latest) 下载与设备架构匹配的安装包：

| 设备 | 推荐文件 |
|---|---|
| 常见 Intel/AMD Windows 电脑 | `OmniFic-<version>-win-x86_64-setup.exe` |
| Windows on ARM 设备 | `OmniFic-<version>-win-arm64-setup.exe` |

优先使用 `setup.exe`。ZIP 是免安装归档形式，解压后运行其中的 OmniFic；ZIP 版本不会自动注册系统卸载项。

Windows 安装版支持应用内检查、下载和安装更新。首次安装需要下载或准备本地 Python 与 OmniFic 后端运行环境，网络较慢时请保持代理可用并关注安装进度。

## macOS 桌面版

| 设备 | 推荐文件 |
|---|---|
| Apple Silicon（M1 及后续芯片） | `OmniFic-<version>-mac-arm64.dmg` |
| Intel Mac | `OmniFic-<version>-mac-x86_64.dmg` |

DMG 是推荐的手动安装包；ZIP 是同架构的归档与后续更新载体。不要在 Apple Silicon 设备上下载 `x86_64` 包。

0.8.2 使用 ad-hoc 签名，但尚未使用 Apple Developer ID 签名和 Apple 公证，因此 macOS 可能显示无法验证开发者或安全警告。首次启动时：

1. 打开 DMG，将 `OmniFic.app` 拖入“应用程序”。
2. 在 Finder 的“应用程序”中按住 Control 点击 OmniFic。
3. 选择“打开”，并在系统确认框中再次选择“打开”。

0.8.2 的 macOS 应用内更新保持禁用。新版本需要从 GitHub Releases 手动下载；正式应用内更新将在 Developer ID 签名和公证启用后开放。

## 通过 PyPI 安装

要求 Python 3.12 或 3.13：

```bash
python -m pip install --upgrade omnific
omnific version
omnific serve
```

默认服务地址为 `http://127.0.0.1:8000`。在浏览器打开该地址即可使用完整 Web 前端。

PyPI 包不包含 `.exe`、`.app`、桌面标题栏、安装向导或应用内更新功能。默认数据目录为 `~/.omnific`，也可以通过 `OMNIFIC_DATA_DIR` 指定其他位置。

## 通过 Docker 运行

```bash
docker pull ghcr.io/f0rjay/omnific:latest
docker run -d \
  --name omnific \
  -p 8000:8000 \
  -v omnific-data:/data \
  ghcr.io/f0rjay/omnific:latest
```

打开 `http://127.0.0.1:8000`。镜像发布 Linux amd64/arm64 多架构版本，这不代表发布 Linux 桌面应用。

## 从源码运行

```bash
git clone https://github.com/F0rJay/OmniFic.git
cd OmniFic

# 终端 1：后端
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .

# 终端 2：前端
cd frontend
pnpm install
pnpm dev
```

前端开发地址为 `http://127.0.0.1:9000`。更多开发命令见[开发环境搭建](./develop/setup.md)。

## 数据备份

升级、迁移或彻底卸载前，请先备份数据目录。桌面端默认把创作数据库、检查点、封面、角色图片、配置和日志放在 Electron 的用户数据目录中；如果安装时选择了自定义运行环境目录，还应一并记录该目录。

不要用 0.8.0 或 OpenFic 的数据目录直接覆盖当前 OmniFic 数据目录。当前命名迁移不保证旧配置和旧目录无损兼容。

## 卸载 Windows 桌面版

### 只删除应用

1. 完全退出 OmniFic。
2. 打开“设置 → 应用 → 已安装的应用”。
3. 找到 OmniFic 并选择“卸载”。

也可以运行安装目录中的 `Uninstall OmniFic.exe`。系统卸载程序默认保留用户数据，方便重新安装后恢复。

### 删除应用及全部数据

完成系统卸载前，可以先查看 `%APPDATA%\omnific-desktop\config.json` 中各本地实例的 `installDir`，记录是否使用了自定义运行环境目录。系统卸载完成后，在文件资源管理器地址栏打开 `%APPDATA%`，将 `omnific-desktop` 文件夹移入回收站；再在确认目录归属后删除自定义位置中的 OmniFic `runtime` 文件夹。

ZIP 版本没有系统卸载项：删除解压出的应用目录，再按上述方式处理用户数据。

## 卸载 macOS 桌面版

### 只删除应用

1. 完全退出 OmniFic，并确认活动监视器中没有 OmniFic 或其本地 Python 后端进程。
2. 将 `/Applications/OmniFic.app` 移入废纸篓。

这不会删除作品、配置或运行环境，重新安装后仍可恢复。

### 删除应用及全部数据

先备份需要保留的作品，并在删除配置前查看 `~/Library/Application Support/omnific-desktop/config.json` 中各本地实例的 `installDir`，记录是否使用了自定义运行环境目录。然后在 Finder 中按 `Command + Shift + G`，逐项检查并将存在的路径移入废纸篓：

- `~/Library/Application Support/omnific-desktop`
- `~/Library/Preferences/com.omnific.app.plist`
- `~/Library/Caches/com.omnific.app`
- `~/Library/Saved Application State/com.omnific.app.savedState`

如果安装时选择了自定义运行环境目录，还需要在确认目录归属后删除其中的 OmniFic `runtime` 文件夹。建议确认应用无法再启动且备份可用后，再清空废纸篓。

## 卸载 PyPI 版本

```bash
python -m pip uninstall omnific
```

该命令不会自动删除 `~/.omnific`。确认不再需要作品与配置后，可以通过文件管理器单独删除该目录。

## 卸载 Docker 版本

```bash
docker stop omnific
docker rm omnific
```

以上命令保留名为 `omnific-data` 的数据卷。确认不再需要任何数据后，再执行：

```bash
docker volume rm omnific-data
```

删除用户数据和 Docker 数据卷是不可逆操作；执行前务必确认备份。
