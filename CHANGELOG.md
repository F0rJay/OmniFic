# Changelog

## 0.8.1 (2026-07-29)

- 修复 Windows 首次安装时网络输出不可见、超时不明确的问题
- 修复桌面端首屏初始化被可选分词模块阻塞而无限加载的问题
- 修复 macOS 便携 Python 路径与 ARM64 桌面包完整性校验
- 修复 macOS Apple Silicon 因 SQLAlchemy 平台标记遗漏 `greenlet` 而无法启动本地后端的问题
- 将 Windows/macOS ARM 桌面产物统一命名为 `arm64`，并补齐 GitHub Release 的 macOS DMG 上传
- 增加桌面 WebView 诊断日志与发行前产物校验
- 桌面安装包内置同版本 OmniFic wheel，并增加仅上传 Actions Artifacts 的候选包构建流程
- 精简候选包下载内容，仅上传 Windows 安装程序或 macOS DMG，完整更新产物继续在 CI 内构建校验
- 补充中英文安装与彻底卸载指南，并更新 README 与官网发行入口
- 新增中英文产品使用指南，覆盖模型配置、创作工作流、Agent 协作与故障排查

## 0.8.0 (2026-07-28)

OmniFic 首个独立发行版，Fork 自 OpenFic v0.7.5，继承其全部历史。

- 确立 OmniFic 作为首个独立发行版
- 新增 PyPI、Docker 及三平台桌面包发布支持
- 将运行时配置、桌面集成及用户界面品牌统一更名为 OmniFic
- 新增 macOS 更新元数据发布；已签名公证的自动更新待 Apple Developer 凭据配置后启用
