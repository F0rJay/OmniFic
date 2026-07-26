# TXT 小说分卷导入

自动识别 TXT 文件中的卷标题，创建正确的 Volume 结构。

## 功能

- 编码自动检测（GB2312/GBK/UTF-8 等）
- 正则匹配章节标题（支持 10+ 种常见格式）
- 识别卷标题（如"第一卷 永夜将至"）
- 章节自动归入对应 Volume
- 第一个卷标题前的序言归入首卷，不生成多余默认卷

## 实现

- `backend/app/core/txt_parser.py` — `_is_volume_heading()` + `_separate_volumes()`
- `backend/app/storage/services/import_service.py` — Volume 创建 + 章节归组
- `backend/app/api/schemas/import_schema.py` — `PreviewChapter.volume_name`
- `frontend/src/features/projects/components/import-dialog.tsx` — 滚动 UX 优化
