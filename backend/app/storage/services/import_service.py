# Modified by OmniFic contributors from OpenFic v0.7.5.
# -*- coding: utf-8 -*-
"""
Import Service - 导入业务逻辑层。
"""

from dataclasses import dataclass

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import save_cover_file
from app.core.txt_parser import ParsedChapter
from app.storage.models.chapter import Chapter
from app.storage.models.project import Project
from app.storage.models.volume import Volume
from app.storage.repos import project_repo
from app.storage.services import writing_activity_service
from app.storage.services.volume_service import DEFAULT_VOLUME_TITLE


@dataclass
class ImportResult:
    """导入结果。"""

    project_id: str
    title: str
    chapter_count: int
    total_word_count: int


async def confirm_import(
    session: AsyncSession,
    title: str,
    description: str | None,
    cover_file: UploadFile | None,
    chapters: list[ParsedChapter],
) -> ImportResult:
    """
    确认导入，创建项目和所有章节。

    自动按卷标题分组：相同 volume_name 的章节归入同一个 Volume，
    没有卷信息的章节归入默认卷。
    """
    # 计算总字数
    total_word_count = sum(c.word_count for c in chapters)

    # 创建项目
    project = Project(
        title=title,
        description=description,
        word_count=total_word_count,
        chapter_count=len(chapters),
    )
    project = await project_repo.create(session, project)

    # 按卷分组：保持出现顺序
    volume_order: list[str | None] = []
    volume_map: dict[str | None, list[ParsedChapter]] = {}
    for chapter in chapters:
        vol = chapter.volume_name
        if vol not in volume_map:
            volume_map[vol] = []
            volume_order.append(vol)
        volume_map[vol].append(chapter)

    # 如果有未分卷章节（None），且存在真实卷名，则合并到第一个卷
    has_real_volumes = any(v is not None for v in volume_order)
    if has_real_volumes and None in volume_map:
        first_real_vol = next(v for v in volume_order if v is not None)
        volume_map[first_real_vol] = volume_map[None] + volume_map[first_real_vol]
        volume_order.remove(None)
        del volume_map[None]

    # 如果没有卷，创建默认卷
    if not volume_order:
        volume_order = [None]
        volume_map[None] = []

    # 为每个卷创建 Volume 记录
    volume_ids: dict[str | None, str] = {}
    for vol_index, vol_name in enumerate(volume_order, start=1):
        vol_chapters = volume_map.get(vol_name, [])
        volume = Volume(
            project_id=project.id,
            title=vol_name if vol_name else DEFAULT_VOLUME_TITLE,
            description=None,
            order=vol_index,
            chapter_count=len(vol_chapters),
        )
        session.add(volume)
        await session.flush()
        volume_ids[vol_name] = volume.id

    # 如果提供了封面文件，保存封面
    if cover_file:
        cover_path = await save_cover_file(project.id, cover_file)
        project.cover_path = cover_path
        project = await project_repo.update(session, project)

    # 按卷顺序创建章节
    chapter_objects = []
    global_order = 0
    for vol_name in volume_order:
        vol_id = volume_ids[vol_name]
        for parsed_chapter in volume_map.get(vol_name, []):
            global_order += 1
            chapter_objects.append(
                Chapter(
                    project_id=project.id,
                    volume_id=vol_id,
                    title=parsed_chapter.title,
                    content=parsed_chapter.content,
                    word_count=parsed_chapter.word_count,
                    order=global_order,
                )
            )

    # 批量插入所有章节
    session.add_all(chapter_objects)
    await session.flush()

    for chapter in chapter_objects:
        await writing_activity_service.record_activity(
            session,
            project_id=project.id,
            chapter_id=chapter.id,
            chapter_title=chapter.title,
            source="import",
            operation="import",
            old_word_count=0,
            new_word_count=chapter.word_count,
        )

    return ImportResult(
        project_id=project.id,
        title=project.title,
        chapter_count=len(chapters),
        total_word_count=total_word_count,
    )
