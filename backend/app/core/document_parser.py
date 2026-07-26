# -*- coding: utf-8 -*-
"""
Document Parser - 将各种格式的文档统一解析为结构化的章节。

使用 markitdown 将 PDF/DOCX/PPTX 等格式转为 Markdown，
再按标题层级切分为 DocumentSection 列表。
"""

import io
import re
from dataclasses import dataclass


@dataclass
class DocumentSection:
    """文档章节。"""

    title: str
    content: str
    level: int


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

SUPPORTED_EXTENSIONS = frozenset({
    ".md", ".markdown", ".txt",
    ".pdf",
    ".docx", ".doc",
    ".pptx", ".ppt",
    ".xlsx", ".xls",
    ".html", ".htm",
})


def _convert_to_markdown(raw: bytes, filename: str) -> str:
    """用 markitdown 将文件转为 Markdown 文本。"""
    filename_lower = filename.lower()

    # Markdown/TXT 直接解码
    if filename_lower.endswith((".md", ".markdown", ".txt")):
        for encoding in ("utf-8", "gb18030", "latin-1"):
            try:
                return raw.decode(encoding)
            except (UnicodeDecodeError, ValueError):
                continue
        return raw.decode("utf-8", errors="replace")

    # 其他格式用 markitdown 转换
    from markitdown import MarkItDown

    md = MarkItDown()
    result = md.convert_stream(io.BytesIO(raw))
    return result.text_content or ""


def _split_markdown_by_headings(markdown_text: str) -> list[DocumentSection]:
    """按 Markdown 标题层级切分为章节。

    策略：
    - 有标题时：每个一级/二级标题开启一个新章节，子标题内容合并到父章节
    - 无标题时：按段落分组，每组约 500 字，自动命名
    """
    lines = markdown_text.split("\n")
    sections: list[DocumentSection] = []
    current_title = ""
    current_level = 0
    current_lines: list[str] = []
    section_started = False

    for line in lines:
        match = _HEADING_RE.match(line)
        if match:
            level = len(match.group(1))
            title = match.group(2).strip()

            # 仅一级和二级标题开启新章节，更深层级归入当前章节
            if level <= 2 and section_started:
                sections.append(DocumentSection(
                    title=current_title,
                    content="\n".join(current_lines).strip(),
                    level=current_level,
                ))
                current_lines = []
            elif level <= 2:
                section_started = True

            if level <= 2:
                current_title = title
                current_level = level
            else:
                # 子标题保留在内容中
                current_lines.append(line)
        else:
            current_lines.append(line)

    # 收集最后一个章节
    if section_started:
        content = "\n".join(current_lines).strip()
        if content or current_title:
            sections.append(DocumentSection(
                title=current_title,
                content=content,
                level=current_level,
            ))

    if not sections:
        # 无标题的文档：按段落分组
        sections = _split_by_paragraphs(markdown_text)

    # 过滤空内容且空标题的章节
    return [s for s in sections if s.title or s.content]


def _split_by_paragraphs(text: str, target_chars: int = 500) -> list[DocumentSection]:
    """无标题的文档按段落分组切分。"""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        # 极端情况：按行分组
        paragraphs = [line.strip() for line in text.split("\n") if line.strip()]

    if not paragraphs:
        return []

    sections: list[DocumentSection] = []
    current_chunks: list[str] = []
    current_len = 0

    for para in paragraphs:
        current_chunks.append(para)
        current_len += len(para)

        if current_len >= target_chars:
            content = "\n\n".join(current_chunks)
            sections.append(DocumentSection(
                title=f"条目 {len(sections) + 1}",
                content=content,
                level=1,
            ))
            current_chunks = []
            current_len = 0

    # 收集剩余内容
    if current_chunks:
        content = "\n\n".join(current_chunks)
        sections.append(DocumentSection(
            title=f"条目 {len(sections) + 1}",
            content=content,
            level=1,
        ))

    return sections


def parse_document_to_sections(raw: bytes, filename: str) -> list[DocumentSection]:
    """将上传的文档解析为 DocumentSection 列表。

    Args:
        raw: 文件原始字节。
        filename: 文件名（用于判断格式）。

    Returns:
        章节列表。
    """
    markdown_text = _convert_to_markdown(raw, filename)
    if not markdown_text.strip():
        return []
    return _split_markdown_by_headings(markdown_text)
