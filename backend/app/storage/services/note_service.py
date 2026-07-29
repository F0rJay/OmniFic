# Modified by OmniFic contributors from OpenFic v0.7.5.
# -*- coding: utf-8 -*-
"""
Note Service - 笔记业务逻辑层。
"""

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.storage.models.note import Note, NoteCategory
from app.storage.repos import (
    note_category_repo,
    note_repo,
    project_repo,
)
from app.storage.services import writing_activity_service


@dataclass
class NoteCategoryNode:
    category: NoteCategory
    sub_categories: list["NoteCategoryNode"] = field(default_factory=list)
    notes: list[Note] = field(default_factory=list)


@dataclass
class NoteTreeResult:
    categories: list[NoteCategoryNode]
    root_notes: list[Note]
    total_notes: int


_CHINESE_DIGITS = {
    "零": 0,
    "〇": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
}
_CHINESE_SMALL_UNITS = {"十": 10, "百": 100, "千": 1000}
_CHINESE_LARGE_UNITS = {"万": 10_000, "亿": 100_000_000}
_CHAPTER_TITLE_RE = re.compile(
    r"^第\s*(?P<number>[0-9零〇一二两三四五六七八九十百千万亿]+)\s*章"
)


def _parse_chinese_number(value: str) -> int | None:
    if value.isdigit():
        return int(value)
    if not value or any(
        char not in _CHINESE_DIGITS
        and char not in _CHINESE_SMALL_UNITS
        and char not in _CHINESE_LARGE_UNITS
        for char in value
    ):
        return None

    if all(char in _CHINESE_DIGITS for char in value):
        return int("".join(str(_CHINESE_DIGITS[char]) for char in value))

    total = 0
    section = 0
    number = 0
    for char in value:
        if char in _CHINESE_DIGITS:
            number = _CHINESE_DIGITS[char]
        elif char in _CHINESE_SMALL_UNITS:
            unit = _CHINESE_SMALL_UNITS[char]
            section += (number or 1) * unit
            number = 0
        else:
            section += number
            total += section * _CHINESE_LARGE_UNITS[char]
            section = 0
            number = 0
    return total + section + number


def _chapter_number_from_title(title: str) -> int | None:
    match = _CHAPTER_TITLE_RE.match(title.strip())
    if match is None:
        return None
    return _parse_chinese_number(match.group("number"))


def _sort_chapter_notes(notes: list[Note]) -> list[Note]:
    chapter_slots: list[int] = []
    chapter_notes: list[tuple[int, Note]] = []
    for index, note in enumerate(notes):
        chapter_number = _chapter_number_from_title(note.title)
        if chapter_number is None:
            continue
        chapter_slots.append(index)
        chapter_notes.append((chapter_number, note))

    if len(chapter_notes) < 2:
        return notes

    chapter_notes.sort(key=lambda item: item[0])
    sorted_notes = list(notes)
    for index, (_, note) in zip(chapter_slots, chapter_notes, strict=True):
        sorted_notes[index] = note
    return sorted_notes


async def _assert_category_depth(session: AsyncSession, parent_id: str) -> None:
    parent = await note_category_repo.get_by_id(session, parent_id)
    if parent is not None and parent.parent_id is not None:
        raise ValueError("分类层级不能超过两级")


async def _assert_parent_belongs_to_project(
    session: AsyncSession, parent_id: str, project_id: str
) -> None:
    parent = await note_category_repo.get_by_id(session, parent_id)
    if parent is None or parent.project_id != project_id:
        raise ValueError("父分类不存在或不属于当前项目")


async def _assert_not_descendant(
    session: AsyncSession, item_id: str, target_id: str
) -> None:
    if target_id is None:
        return
    current: str | None = target_id
    while current is not None:
        if current == item_id:
            raise ValueError("不能将分类移动到自身或其后代下")
        category = await note_category_repo.get_by_id(session, current)
        current = category.parent_id if category else None


async def create_note(
    session: AsyncSession,
    project_id: str,
    category_id: str | None,
    title: str,
    content: str = "",
) -> Note:
    project = await project_repo.get_by_id(session, project_id)
    if project is None:
        raise NotFoundError(f"项目不存在: {project_id}")

    if category_id is not None:
        category = await note_category_repo.get_by_id(session, category_id)
        if category is None:
            raise NotFoundError(f"分类不存在: {category_id}")
        if category.project_id != project_id:
            raise ValueError("分类不属于当前项目")

    notes = await note_repo.list_by_project(session, project_id, include_hidden=True)
    siblings = {n.title for n in notes if n.category_id == category_id}
    unique_title = title
    counter = 1
    while unique_title in siblings:
        unique_title = f"{title}({counter})"
        counter += 1

    note = Note(
        project_id=project_id,
        category_id=category_id,
        title=unique_title,
        content=content,
    )
    note = await note_repo.create(session, note)

    await writing_activity_service.record_activity(
        session,
        project_id=project_id,
        chapter_id=note.id,
        chapter_title=note.title,
        source="user",
        operation="create",
        old_word_count=0,
        new_word_count=0,
    )
    return note


async def get_note(session: AsyncSession, note_id: str) -> Note:
    note = await note_repo.get_by_id(session, note_id)
    if note is None:
        raise NotFoundError(f"笔记不存在: {note_id}")
    return note


async def list_notes(
    session: AsyncSession,
    project_id: str,
) -> NoteTreeResult:
    project = await project_repo.get_by_id(session, project_id)
    if project is None:
        raise NotFoundError(f"项目不存在: {project_id}")

    categories = await note_category_repo.list_by_project(session, project_id)
    notes = await note_repo.list_by_project(session, project_id, include_hidden=True)

    cat_by_parent: dict[str | None, list[NoteCategory]] = {}
    for cat in categories:
        cat_by_parent.setdefault(cat.parent_id, []).append(cat)

    notes_by_category: dict[str | None, list[Note]] = {}
    for note in notes:
        notes_by_category.setdefault(note.category_id, []).append(note)
    notes_by_category = {
        category_id: _sort_chapter_notes(category_notes)
        for category_id, category_notes in notes_by_category.items()
    }

    def build_node(cat: NoteCategory) -> NoteCategoryNode:
        return NoteCategoryNode(
            category=cat,
            sub_categories=[build_node(c) for c in cat_by_parent.get(cat.id, [])],
            notes=notes_by_category.get(cat.id, []),
        )

    tree_nodes = [build_node(c) for c in cat_by_parent.get(None, [])]
    root_notes = notes_by_category.get(None, [])

    return NoteTreeResult(
        categories=tree_nodes,
        root_notes=root_notes,
        total_notes=len(notes),
    )


async def update_note(
    session: AsyncSession,
    note_id: str,
    title: str | None = None,
    content: str | None = None,
) -> Note:
    note = await get_note(session, note_id)
    changed = False

    if title is not None and title != note.title:
        note.title = title
        changed = True

    if content is not None and content != note.content:
        note.content = content
        changed = True

    if changed:
        note.updated_at = datetime.now(UTC)
        note = await note_repo.update_note(session, note)
        await writing_activity_service.record_activity(
            session,
            project_id=note.project_id,
            chapter_id=note.id,
            chapter_title=note.title,
            source="user",
            operation="update",
            old_word_count=0,
            new_word_count=0,
        )
    return note


async def delete_note(
    session: AsyncSession,
    note_id: str,
) -> None:
    note = await get_note(session, note_id)
    project_id = note.project_id
    old_title = note.title
    await note_repo.delete(session, note)
    await writing_activity_service.record_activity(
        session,
        project_id=project_id,
        chapter_id=note_id,
        chapter_title=old_title,
        source="user",
        operation="delete",
        old_word_count=0,
        new_word_count=0,
    )


async def set_note_locked(
    session: AsyncSession,
    note_id: str,
    is_locked: bool,
) -> Note:
    note = await get_note(session, note_id)
    if note.is_locked != is_locked:
        note.is_locked = is_locked
        note.updated_at = datetime.now(UTC)
        note = await note_repo.update_note(session, note)
        await writing_activity_service.record_activity(
            session,
            project_id=note.project_id,
            chapter_id=note.id,
            chapter_title=note.title,
            source="user",
            operation="update",
            old_word_count=0,
            new_word_count=0,
        )
    return note


async def set_note_hidden(
    session: AsyncSession,
    note_id: str,
    is_hidden: bool,
) -> Note:
    note = await get_note(session, note_id)
    if note.is_hidden != is_hidden:
        note.is_hidden = is_hidden
        note.updated_at = datetime.now(UTC)
        note = await note_repo.update_note(session, note)
        await writing_activity_service.record_activity(
            session,
            project_id=note.project_id,
            chapter_id=note.id,
            chapter_title=note.title,
            source="user",
            operation="update",
            old_word_count=0,
            new_word_count=0,
        )
    return note


async def create_category(
    session: AsyncSession,
    project_id: str,
    parent_id: str | None,
    title: str,
) -> NoteCategory:
    project = await project_repo.get_by_id(session, project_id)
    if project is None:
        raise NotFoundError(f"项目不存在: {project_id}")

    if parent_id is not None:
        await _assert_category_depth(session, parent_id)
        await _assert_parent_belongs_to_project(session, parent_id, project_id)

    cats = await note_category_repo.list_by_project(session, project_id)
    siblings = {c.title for c in cats if c.parent_id == parent_id}
    unique_title = title
    counter = 1
    while unique_title in siblings:
        unique_title = f"{title}({counter})"
        counter += 1

    category = NoteCategory(
        project_id=project_id,
        parent_id=parent_id,
        title=unique_title,
    )
    return await note_category_repo.create(session, category)


async def update_category(
    session: AsyncSession,
    category_id: str,
    title: str | None,
) -> NoteCategory:
    category = await note_category_repo.get_by_id(session, category_id)
    if category is None:
        raise NotFoundError(f"分类不存在: {category_id}")

    if title is not None and title != category.title:
        category.title = title
        category.updated_at = datetime.now(UTC)
        category = await note_category_repo.update_category(session, category)
    return category


async def delete_category(
    session: AsyncSession,
    category_id: str,
) -> None:
    category = await note_category_repo.get_by_id(session, category_id)
    if category is None:
        raise NotFoundError(f"分类不存在: {category_id}")

    children = await note_category_repo.get_by_parent(session, category_id)
    for child in children:
        await delete_category(session, child.id)

    notes_in_category = await note_repo.list_by_project(
        session, category.project_id, include_hidden=True
    )
    for note in notes_in_category:
        if note.category_id == category_id:
            await note_repo.delete(session, note)

    await note_category_repo.delete(session, category)


async def move_item(
    session: AsyncSession,
    item_kind: Literal["category", "note"],
    item_id: str,
    target_category_id: str | None,
) -> Note | NoteCategory:
    if item_kind == "category":
        category = await note_category_repo.get_by_id(session, item_id)
        if category is None:
            raise NotFoundError(f"分类不存在: {item_id}")

        if target_category_id is not None:
            target = await note_category_repo.get_by_id(session, target_category_id)
            if target is None or target.project_id != category.project_id:
                raise ValueError("目标分类不存在或不属于当前项目")
            await _assert_not_descendant(session, item_id, target_category_id)
            if target.parent_id is not None:
                raise ValueError("分类层级不能超过两级")

        category.parent_id = target_category_id
        category.updated_at = datetime.now(UTC)
        category = await note_category_repo.update_category(session, category)

        await writing_activity_service.record_activity(
            session,
            project_id=category.project_id,
            chapter_id=category.id,
            chapter_title=category.title,
            source="user",
            operation="update",
            old_word_count=0,
            new_word_count=0,
        )
        return category

    else:
        note = await note_repo.get_by_id(session, item_id)
        if note is None:
            raise NotFoundError(f"笔记不存在: {item_id}")

        if target_category_id is not None:
            target = await note_category_repo.get_by_id(session, target_category_id)
            if target is None or target.project_id != note.project_id:
                raise ValueError("目标分类不存在或不属于当前项目")

        note.category_id = target_category_id
        note.updated_at = datetime.now(UTC)
        note = await note_repo.update_note(session, note)

        await writing_activity_service.record_activity(
            session,
            project_id=note.project_id,
            chapter_id=note.id,
            chapter_title=note.title,
            source="user",
            operation="update",
            old_word_count=0,
            new_word_count=0,
        )
        return note


async def search_mention_candidates(
    session: AsyncSession,
    project_id: str,
    query: str,
    *,
    limit: int,
) -> list:
    from app.storage.services.mention_service import (
        search_all_mention_candidates,
    )

    return await search_all_mention_candidates(
        session, project_id, query, limit=limit, kind="note"
    )


@dataclass
class NoteSearchMatch:
    """笔记内容搜索匹配行。"""

    line_number: int
    line_text: str


@dataclass
class NoteSearchResult:
    """笔记内容搜索结果。"""

    note_id: str
    note_title: str
    category_path: str
    matches: list[NoteSearchMatch]


@dataclass
class NoteSearchResponse:
    """笔记内容搜索响应。"""

    results: list[NoteSearchResult]
    total_notes: int
    total_matches: int


async def _build_category_path(
    session: AsyncSession,
    category_id: str | None,
) -> str:
    """构建分类路径字符串。"""
    if category_id is None:
        return ""
    parts: list[str] = []
    current_id: str | None = category_id
    while current_id is not None:
        cat = await note_category_repo.get_by_id(session, current_id)
        if cat is None:
            break
        parts.append(cat.title or "未命名分类")
        current_id = cat.parent_id
    parts.reverse()
    return " / ".join(parts)


async def search_notes(
    session: AsyncSession,
    project_id: str,
    query: str,
) -> NoteSearchResponse:
    """按内容搜索笔记。"""
    project = await project_repo.get_by_id(session, project_id)
    if project is None:
        raise NotFoundError(f"项目不存在: {project_id}")

    if not query.strip():
        return NoteSearchResponse(results=[], total_notes=0, total_matches=0)

    notes = await note_repo.search_by_content(session, project_id, query)

    results: list[NoteSearchResult] = []
    total_matches = 0
    lower_query = query.lower()

    for note in notes:
        lines = note.content.split("\n")
        matches: list[NoteSearchMatch] = []
        for line_number, line in enumerate(lines, start=1):
            if lower_query in line.lower():
                matches.append(
                    NoteSearchMatch(
                        line_number=line_number,
                        line_text=line,
                    )
                )

        if matches:
            category_path = await _build_category_path(session, note.category_id)
            results.append(
                NoteSearchResult(
                    note_id=note.id,
                    note_title=note.title or "未命名笔记",
                    category_path=category_path,
                    matches=matches,
                )
            )
            total_matches += len(matches)

    return NoteSearchResponse(
        results=results,
        total_notes=len(results),
        total_matches=total_matches,
    )
