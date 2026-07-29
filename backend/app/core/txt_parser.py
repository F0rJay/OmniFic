# Modified by OmniFic contributors from OpenFic v0.7.5.
# -*- coding: utf-8 -*-
"""
TXT 文件解析模块 - 章节识别和内容切分。

基于正则规则匹配章节标题，支持多种常见格式：
- 第X章/节/卷/集/部/篇 标题
- Chapter X 标题
- 数字、标题 或 数字. 标题
- 特殊符号开头的标题
"""

import re
from dataclasses import dataclass, field

from charset_normalizer import from_bytes


@dataclass
class ParsedChapter:
    """解析后的单个章节。"""

    title: str
    content: str
    word_count: int
    volume_name: str | None = None


@dataclass
class ParseResult:
    """TXT 解析结果。"""

    chapters: list[ParsedChapter] = field(default_factory=list)
    total_word_count: int = 0
    chapter_count: int = 0
    detected_encoding: str = "utf-8"


# 章节标题正则规则列表（按优先级排序）
# 参考 legado 阅读器的 txtTocRule.json
TOC_RULES: list[tuple[str, re.Pattern[str]]] = [
    # 目录(去空白) - 第X章/节/卷/集 标题（使用行首 + 可选空白替代 lookbehind）
    (
        "目录(去空白)",
        re.compile(
            r"^[\s　]+(?:序章|楔子|正文(?!完|结)|终章|后记|尾声|番外|"
            r"第\s{0,4}[\d〇零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+?\s{0,4}"
            r"(?:章|节(?!课)|卷|集(?![合和]))).{0,30}$",
            re.MULTILINE,
        ),
    ),
    # 目录 - 标准格式
    (
        "目录",
        re.compile(
            r"^[ 　\t]{0,4}(?:序章|楔子|正文(?!完|结)|终章|后记|尾声|番外|"
            r"第\s{0,4}[\d〇零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+?\s{0,4}"
            r"(?:章|节(?!课)|卷|集(?![合和])|部(?![分赛游])|篇(?!张))).{0,30}$",
            re.MULTILINE,
        ),
    ),
    # 数字 分隔符 标题名称
    (
        "数字 分隔符 标题",
        re.compile(
            r"^[ 　\t]{0,4}\d{1,5}[:：,.， 、_—\-].{1,30}$",
            re.MULTILINE,
        ),
    ),
    # 大写数字 分隔符 标题名称
    (
        "大写数字 分隔符 标题",
        re.compile(
            r"^[ 　\t]{0,4}(?:序章|楔子|正文(?!完|结)|终章|后记|尾声|番外|"
            r"[零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]{1,8}章?)[ 、_—\-].{1,30}$",
            re.MULTILINE,
        ),
    ),
    # 正文 标题/序号
    (
        "正文 标题",
        re.compile(
            r"^[ 　\t]{0,4}正文[ 　]{1,4}.{0,20}$",
            re.MULTILINE,
        ),
    ),
    # Chapter/Section/Part/Episode 序号 标题
    (
        "Chapter/Section",
        re.compile(
            r"^[ 　\t]{0,4}(?:[Cc]hapter|[Ss]ection|[Pp]art|ＰＡＲＴ|[Nn][oO][.、]|[Ee]pisode|"
            r"(?:内容|文章)?简介|文案|前言|序章|楔子|正文(?!完|结)|终章|后记|尾声|番外)"
            r"\s{0,4}\d{1,4}.{0,30}$",
            re.MULTILINE,
        ),
    ),
    # 特殊符号 序号 标题（使用行首匹配替代 lookbehind）
    (
        "特殊符号 序号 标题",
        re.compile(
            r"^[\s　]*[【〔〖「『〈［\[](?:第|[Cc]hapter)"
            r"[\d零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]{1,10}[章节].{0,20}$",
            re.MULTILINE,
        ),
    ),
    # 特殊符号 标题(单个) - 晋江常见格式（使用行首匹配替代 lookbehind）
    (
        "特殊符号 标题",
        re.compile(
            r"^[\s　]*(?:[☆★✦✧].{1,30}|"
            r"(?:内容|文章)?简介|文案|前言|序章|楔子|正文(?!完|结)|终章|后记|尾声|番外)[ 　]{0,4}$",
            re.MULTILINE,
        ),
    ),
    # 章/卷 序号 标题
    (
        "章/卷 序号 标题",
        re.compile(
            r"^[ \t　]{0,4}(?:(?:内容|文章)?简介|文案|前言|序章|楔子|正文(?!完|结)|终章|后记|尾声|番外|"
            r"[卷章][\d零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]{1,8})[ 　]{0,4}.{0,30}$",
            re.MULTILINE,
        ),
    ),
    # 书名 括号 序号
    (
        "书名 括号 序号",
        re.compile(
            r"^[一-龥]{1,20}[ 　\t]{0,4}[(（]"
            r"[\d〇零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]{1,8}[)）][ 　\t]{0,4}$",
            re.MULTILINE,
        ),
    ),
    # 书名 序号
    (
        "书名 序号",
        re.compile(
            r"^[一-龥]{1,20}[ 　\t]{0,4}"
            r"[\d〇零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]{1,8}[ 　\t]{0,4}$",
            re.MULTILINE,
        ),
    ),
]


def _detect_encoding(content: bytes) -> str:
    """
    检测文件编码。

    Args:
        content: 文件字节内容。

    Returns:
        检测到的编码名称，默认 utf-8。
    """
    match = from_bytes(content).best()
    if match is None or match.encoding is None:
        return "utf-8"

    encoding = match.encoding.lower().replace("_", "-")
    if encoding in ("gb2312", "gbk", "gb18030"):
        return "gb18030"  # 使用兼容性最好的 gb18030

    return encoding


def _count_words(text: str) -> int:
    """
    统计中文字数。

    统计规则：中文字符按字计数，英文单词按词计数。

    Args:
        text: 文本内容。

    Returns:
        字数。
    """
    # 移除空白字符
    text = text.strip()
    if not text:
        return 0

    # 统计中文字符数
    chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", text))

    # 统计英文单词数
    english_words = len(re.findall(r"[a-zA-Z]+", text))

    # 统计数字
    numbers = len(re.findall(r"\d+", text))

    return chinese_chars + english_words + numbers


# _text_to_html 函数已移除
# 现在直接使用换行符格式保存到数据库，不再转换为 HTML


def _select_best_toc_rule(text: str) -> re.Pattern[str] | None:
    """
    选择最佳的目录规则。

    通过在文本开头部分测试每个规则，选择匹配数量最多的规则。

    Args:
        text: 文件文本内容。

    Returns:
        最佳匹配的正则表达式，如果没有匹配则返回 None。
    """
    # 取前 512KB 内容进行规则测试
    sample_text = text[:512000]

    best_pattern: re.Pattern[str] | None = None
    max_matches = 0

    for _rule_name, pattern in TOC_RULES:
        # 过滤掉间隔太近的匹配（避免误匹配）
        valid_matches = 0
        last_pos = -1000
        for match in pattern.finditer(sample_text):
            if match.start() - last_pos > 500:  # 章节间隔至少 500 字符
                valid_matches += 1
                last_pos = match.end()

        if valid_matches > max_matches:
            max_matches = valid_matches
            best_pattern = pattern

    # 至少需要 2 个匹配才认为找到了章节规则
    if max_matches >= 2:
        return best_pattern

    return None


# 卷标题正则：匹配"第X卷/部/篇"或"卷/部/篇 X"格式的标题（不含章/节）
_VOLUME_KEYWORD_RE = re.compile(
    r"(?:第\s{0,4}[\d〇零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+?\s{0,4}"
    r"(?:卷|部(?![分赛游])|篇(?!张)))"
    r"|"
    r"(?:^卷\s{0,4}[\d〇零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+?\s{0,4}.{0,20}$)",
    re.MULTILINE,
)

# 明确的章节关键词（用于排除：标题含"章"或"节"的不是卷标题）
_CHAPTER_KEYWORD_RE = re.compile(r"(?:章|节(?!课))")


def _is_volume_heading(title: str, content: str) -> bool:
    """判断一个解析出的标题是否实际上是卷标题而非章节标题。

    判定规则：
    - 标题匹配卷关键词（卷/部/篇）且不含章节关键词（章/节）
    - 且内容很少（少于 100 字），说明它只是一个卷分隔标记
    """
    if not title:
        return False

    # 标题包含"章"或"节"→ 一定是章节，不是卷
    if _CHAPTER_KEYWORD_RE.search(title):
        return False

    # 标题匹配卷关键词
    if not _VOLUME_KEYWORD_RE.search(title):
        return False

    # 内容很少 → 是卷标记；内容多 → 保留为章节（可能只是碰巧匹配）
    if len(content.strip()) > 100:
        return False

    return True


def _separate_volumes(
    chapters: list[ParsedChapter],
    raw_text: str = "",
    first_chapter_pos: int = -1,
) -> list[ParsedChapter]:
    """识别卷标题，将其从章节列表中分离，并为后续章节标记所属卷。

    - 卷标题（如"第一卷"）不作为章节保留，而是作为卷名赋给后续章节
    - 第一个卷标题之前的章节归入默认卷（volume_name=None）
    - 额外扫描 raw_text 在 first_chapter_pos 之前的内容，检测被 TOC 规则遗漏的卷标题
    """
    if not chapters:
        return chapters

    # 扫描第一个章节之前的原文，检测遗漏的卷标题
    leading_volume: str | None = None
    if raw_text and first_chapter_pos > 0:
        preface = raw_text[:first_chapter_pos]
        for line in preface.split("\n"):
            line_stripped = line.strip()
            if line_stripped and _is_volume_heading(line_stripped, ""):
                leading_volume = line_stripped
                break

    result: list[ParsedChapter] = []
    # 如果检测到前置卷标题，标记前面的章节
    current_volume = leading_volume

    for chapter in chapters:
        if _is_volume_heading(chapter.title, chapter.content):
            # 这是一个卷标题，更新当前卷名
            current_volume = chapter.title.strip()
            # 如果卷标题下有少量内容，附加为一条笔记式章节
            content_stripped = chapter.content.strip()
            if content_stripped and len(content_stripped) > 20:
                result.append(ParsedChapter(
                    title=f"{current_volume} · 卷首语",
                    content=content_stripped,
                    word_count=chapter.word_count,
                    volume_name=current_volume,
                ))
        else:
            result.append(ParsedChapter(
                title=chapter.title,
                content=chapter.content,
                word_count=chapter.word_count,
                volume_name=current_volume,
            ))

    return result


def parse_txt_content(content: bytes) -> ParseResult:
    """
    解析 TXT 文件内容。

    Args:
        content: TXT 文件的字节内容。

    Returns:
        ParseResult 解析结果。
    """
    if not content:
        return ParseResult()

    # 检测编码
    encoding = _detect_encoding(content)

    # 解码内容
    try:
        text = content.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        # 解码失败，尝试使用 UTF-8 并忽略错误
        text = content.decode("utf-8", errors="ignore")
        encoding = "utf-8"

    # 移除 BOM
    if text.startswith("\ufeff"):
        text = text[1:]

    # 标准化换行符
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 选择最佳目录规则
    toc_pattern = _select_best_toc_rule(text)

    chapters: list[ParsedChapter] = []
    first_ch_pos = -1

    if toc_pattern is None:
        # 没有识别到章节，整个内容作为一个章节
        content_stripped = text.strip()
        if content_stripped:
            word_count = _count_words(content_stripped)
            # 尝试从第一行提取标题
            lines = content_stripped.split("\n", 1)
            if len(lines) >= 1 and len(lines[0].strip()) <= 50:
                title = lines[0].strip() or "正文"
                chapter_content = lines[1].strip() if len(lines) > 1 else ""
            else:
                title = "正文"
                chapter_content = content_stripped

            chapters.append(
                ParsedChapter(
                    title=title,
                    content=chapter_content,  # 直接使用换行符格式，不转换为 HTML
                    word_count=word_count,
                )
            )
    else:
        # 使用正则切分章节
        matches = list(toc_pattern.finditer(text))
        if matches:
            first_ch_pos = matches[0].start()

        if not matches:
            # 没有匹配，整个内容作为一个章节
            content_stripped = text.strip()
            if content_stripped:
                word_count = _count_words(content_stripped)
            chapters.append(
                ParsedChapter(
                    title="正文",
                    content=content_stripped,  # 直接使用换行符格式，不转换为 HTML
                    word_count=word_count,
                )
            )
        else:
            # 处理第一个章节之前的内容（可能是序言/简介）
            first_match_start = matches[0].start()
            if first_match_start > 100:  # 前面内容超过 100 字符才作为序言
                preface_content = text[:first_match_start].strip()
                if preface_content:
                    word_count = _count_words(preface_content)
                    if word_count > 50:  # 序言至少 50 字
                        chapters.append(
                            ParsedChapter(
                                title="前言",
                                content=preface_content,  # 直接使用换行符格式，不转换为 HTML
                                word_count=word_count,
                            )
                        )

            # 处理每个章节
            for i, match in enumerate(matches):
                title = match.group().strip()

                # 获取章节内容（从标题结束到下一个章节开始）
                content_start = match.end()
                if i + 1 < len(matches):
                    content_end = matches[i + 1].start()
                else:
                    content_end = len(text)

                chapter_content = text[content_start:content_end].strip()

                # 移除内容开头的标题重复
                if chapter_content.startswith(title):
                    chapter_content = chapter_content[len(title) :].strip()

                # 清理内容开头的空白和换行
                chapter_content = re.sub(r"^[\n\s]+", "　　", chapter_content)

                word_count = _count_words(chapter_content)

                chapters.append(
                    ParsedChapter(
                        title=title,
                        content=chapter_content,  # 直接使用换行符格式，不转换为 HTML
                        word_count=word_count,
                    )
                )

    # 识别卷标题，分离卷和章
    chapters = _separate_volumes(chapters, raw_text=text, first_chapter_pos=first_ch_pos)

    # 计算总字数
    total_word_count = sum(c.word_count for c in chapters)

    return ParseResult(
        chapters=chapters,
        total_word_count=total_word_count,
        chapter_count=len(chapters),
        detected_encoding=encoding,
    )
