# 世界书多格式导入

支持将 Markdown / PDF / Word / PPT / TXT 等文档直接导入为世界书条目。

## 功能

- 上传 MD/PDF/DOCX/PPTX/XLSX/HTML 文件
- MarkItDown 统一转换为 Markdown
- 按标题层级自动切分为条目
- AI 增强：合并重复、拆分过长、优化命名

## 实现

- `backend/app/core/document_parser.py` — MarkItDown 转换 + 标题切分
- `backend/app/storage/services/world_info_convert_service.py` — 条目转换 + AI 优化
- `backend/app/api/routers/world_info_entries.py` — 导入 API
- `frontend/src/features/world-info/components/import-world-info-dialog.tsx` — 格式选择 Tab
