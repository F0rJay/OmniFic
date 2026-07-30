"""Readiness workflow and hard gate for Agent-authored novel chapters."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.storage.models.writing_readiness import WritingReadiness
from app.storage.repos import (
    character_repo,
    chapter_repo,
    note_repo,
    project_repo,
    writing_readiness_repo,
)
from app.storage.repos import world_info_entry_repo, world_info_repo
from app.storage.services.world_info_service import get_or_create_world_info_by_project

ReviewStatus = Literal["pass", "fail"]

MACRO_OUTLINE_TITLES = (
    "全书总纲",
    "全书粗纲",
    "全书宏观大纲",
    "宏观大纲",
)
OPENING_OUTLINE_TITLES = (
    "开篇细纲",
    "开局细纲",
    "首段细纲",
    "首个剧情段细纲",
)


class WritingReadinessConflict(ValueError):
    def __init__(self, message: str, *, blockers: list[str] | None = None) -> None:
        super().__init__(message)
        self.blockers = blockers or []


async def _get_project(session: AsyncSession, project_id: str):
    project = await project_repo.get_by_id(session, project_id)
    if project is None:
        raise NotFoundError(f"项目不存在: {project_id}")
    return project


async def _get_or_create_row(
    session: AsyncSession,
    project_id: str,
) -> WritingReadiness:
    row = await writing_readiness_repo.get_by_project(session, project_id)
    if row is not None:
        return row
    return await writing_readiness_repo.create(
        session,
        WritingReadiness(project_id=project_id),
    )


def _has_title(notes: list[Any], candidates: tuple[str, ...]) -> bool:
    normalized = [str(note.title).strip().lower() for note in notes]
    return any(
        candidate.lower() in title for title in normalized for candidate in candidates
    )


async def _load_artifacts(session: AsyncSession, project_id: str) -> dict[str, Any]:
    project = await _get_project(session, project_id)
    chapters = await chapter_repo.list_by_project(session, project_id)
    characters, _ = await character_repo.list_by_project(
        session,
        project_id,
        page=1,
        page_size=10_000,
    )
    notes = await note_repo.list_by_project(session, project_id)
    world_info = await world_info_repo.get_by_project_id(session, project_id)
    if world_info is None:
        world_info = await get_or_create_world_info_by_project(session, project_id)
    world_entries = await world_info_entry_repo.list_by_world_info(
        session,
        world_info.id,
        offset=0,
        limit=10_000,
    )
    return {
        "project": project,
        "chapters": chapters,
        "characters": characters,
        "notes": notes,
        "world_entries": world_entries,
    }


def _snapshot_payload(artifacts: dict[str, Any]) -> dict[str, Any]:
    project = artifacts["project"]
    readiness_notes = [
        row
        for row in artifacts["notes"]
        if _has_title([row], MACRO_OUTLINE_TITLES)
        or _has_title([row], OPENING_OUTLINE_TITLES)
    ]
    return {
        "project": {
            "title": project.title,
            "description": project.description or "",
        },
        "characters": sorted(
            (
                {
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                }
                for row in artifacts["characters"]
            ),
            key=lambda item: item["id"],
        ),
        "world_entries": sorted(
            (
                {
                    "id": row.id,
                    "name": row.name,
                    "content": row.content,
                    "enabled": row.is_enabled,
                    "order": row.order,
                }
                for row in artifacts["world_entries"]
            ),
            key=lambda item: item["id"],
        ),
        "notes": sorted(
            (
                {
                    "id": row.id,
                    "category_id": row.category_id,
                    "title": row.title,
                    "content": row.content,
                    "hidden": row.is_hidden,
                }
                for row in readiness_notes
            ),
            key=lambda item: item["id"],
        ),
    }


def _snapshot_hash(artifacts: dict[str, Any]) -> str:
    encoded = json.dumps(
        _snapshot_payload(artifacts),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _base_requirements(artifacts: dict[str, Any]) -> list[dict[str, Any]]:
    notes = artifacts["notes"]
    return [
        {
            "id": "core_worldbook",
            "label": "核心世界书",
            "ready": bool(artifacts["world_entries"]),
            "detail": "至少包含世界规则、关系或势力、时间线与不可违反设定，并补充题材专属规则。",
        },
        {
            "id": "main_characters",
            "label": "主要角色",
            "ready": bool(artifacts["characters"]),
            "detail": "至少建立主角和推动核心冲突的主要角色。",
        },
        {
            "id": "macro_outline",
            "label": "全书宏观粗纲",
            "ready": _has_title(notes, MACRO_OUTLINE_TITLES),
            "detail": "使用“全书总纲”等明确标题，覆盖结局、主线、阶段、关键转折、人物弧光和伏笔回收。",
        },
        {
            "id": "opening_outline",
            "label": "首个剧情段细纲",
            "ready": _has_title(notes, OPENING_OUTLINE_TITLES),
            "detail": "使用“开篇细纲”等明确标题，以剧情单元和节拍达到 Writer 可执行粒度。",
        },
    ]


def _stage(
    *,
    artifacts: dict[str, Any],
    row: WritingReadiness | None,
    current_hash: str,
    requirements: list[dict[str, Any]],
) -> str:
    if artifacts["chapters"]:
        return "writing"
    by_id = {item["id"]: item["ready"] for item in requirements}
    if not by_id["core_worldbook"] or not by_id["main_characters"]:
        return "worldbuilding"
    if not by_id["macro_outline"]:
        return "macro_outline"
    if not by_id["opening_outline"]:
        return "opening_outline"
    if (
        row is None
        or row.review_status != "pass"
        or row.review_snapshot_hash != current_hash
    ):
        return "review"
    return "ready"


async def get_status(session: AsyncSession, project_id: str) -> dict[str, Any]:
    artifacts = await _load_artifacts(session, project_id)
    row = await writing_readiness_repo.get_by_project(session, project_id)
    current_hash = _snapshot_hash(artifacts)
    requirements = _base_requirements(artifacts)
    stage = _stage(
        artifacts=artifacts,
        row=row,
        current_hash=current_hash,
        requirements=requirements,
    )
    review_stale = bool(
        row
        and row.review_snapshot_hash
        and row.review_snapshot_hash != current_hash
        and not artifacts["chapters"]
    )
    blockers = [item["label"] for item in requirements if not item["ready"]]
    if not artifacts["chapters"]:
        if row is None or row.review_status is None:
            blockers.append("尚未完成开写准入审查")
        elif row.review_status == "fail":
            blockers.extend(row.review_issues or ["准入审查未通过"])
        elif review_stale:
            blockers.append("准入资料已变更，需要重新审查")
    return {
        "project_id": project_id,
        "stage": stage,
        "ready_to_start": stage == "ready",
        "is_stale": review_stale,
        "requirements": requirements,
        "review": {
            "status": row.review_status if row else None,
            "summary": row.review_summary if row else "",
            "issues": list(row.review_issues) if row else [],
            "snapshot_hash": row.review_snapshot_hash if row else None,
            "is_stale": review_stale,
        },
        "blockers": list(dict.fromkeys(blockers)),
        "artifact_summary": {
            "world_entries": len(artifacts["world_entries"]),
            "characters": len(artifacts["characters"]),
            "notes": len(artifacts["notes"]),
            "chapters": len(artifacts["chapters"]),
        },
    }


async def submit_review(
    session: AsyncSession,
    project_id: str,
    *,
    status: ReviewStatus,
    summary: str,
    issues: list[str],
) -> dict[str, Any]:
    artifacts = await _load_artifacts(session, project_id)
    requirements = _base_requirements(artifacts)
    missing = [item["label"] for item in requirements if not item["ready"]]
    if status == "pass" and missing:
        raise WritingReadinessConflict(
            "准入资料不完整，不能记录通过结果",
            blockers=missing,
        )
    row = await _get_or_create_row(session, project_id)
    row.review_status = status
    row.review_summary = summary.strip()
    row.review_issues = [item.strip() for item in issues if item.strip()]
    row.review_snapshot_hash = _snapshot_hash(artifacts)
    row.authorized_revision_id = None
    row.authorized_snapshot_hash = None
    row.authorized_at = None
    row.updated_at = datetime.now(UTC)
    await writing_readiness_repo.update(session, row)
    return await get_status(session, project_id)


async def authorize_current_request(
    session: AsyncSession,
    project_id: str,
    *,
    revision_id: str,
) -> dict[str, Any]:
    artifacts = await _load_artifacts(session, project_id)
    if artifacts["chapters"]:
        return await get_agent_status(
            session,
            project_id,
            revision_id=revision_id,
        )
    row = await writing_readiness_repo.get_by_project(session, project_id)
    current_hash = _snapshot_hash(artifacts)
    requirements = _base_requirements(artifacts)
    blockers = [item["label"] for item in requirements if not item["ready"]]
    if row is None or row.review_status is None:
        blockers.append("准入审查尚未通过")
    elif row.review_status == "fail":
        blockers.extend(row.review_issues or ["准入审查未通过"])
    elif row.review_snapshot_hash != current_hash:
        blockers.append("准入资料在审查后发生变化，需要重新审查")
    if blockers:
        raise WritingReadinessConflict(
            "当前项目尚未完成正文准备",
            blockers=blockers,
        )
    if row is None:
        # Kept explicit for static narrowing; a missing row always contributes
        # a blocker above and therefore cannot reach this branch.
        raise WritingReadinessConflict(
            "准入审查记录不存在",
            blockers=["准入审查尚未通过"],
        )
    if not revision_id.strip():
        raise WritingReadinessConflict(
            "缺少当前用户回合，不能授权正文写作",
            blockers=["缺少当前用户回合"],
        )
    row.authorized_revision_id = revision_id
    row.authorized_snapshot_hash = current_hash
    row.authorized_at = datetime.now(UTC)
    row.updated_at = datetime.now(UTC)
    await writing_readiness_repo.update(session, row)
    return await get_agent_status(
        session,
        project_id,
        revision_id=revision_id,
    )


async def is_current_request_authorized(
    session: AsyncSession,
    project_id: str,
    *,
    revision_id: str | None,
) -> bool:
    artifacts = await _load_artifacts(session, project_id)
    if artifacts["chapters"]:
        return True
    if not revision_id:
        return False
    row = await writing_readiness_repo.get_by_project(session, project_id)
    if row is None or row.review_status != "pass":
        return False
    current_hash = _snapshot_hash(artifacts)
    return bool(
        row.review_snapshot_hash == current_hash
        and row.authorized_revision_id == revision_id
        and row.authorized_snapshot_hash == current_hash
        and row.authorized_at is not None
    )


async def get_agent_status(
    session: AsyncSession,
    project_id: str,
    *,
    revision_id: str | None,
) -> dict[str, Any]:
    payload = await get_status(session, project_id)
    authorized = await is_current_request_authorized(
        session,
        project_id,
        revision_id=revision_id,
    )
    payload["authorized_for_current_request"] = authorized
    payload["can_agent_write"] = payload["stage"] == "writing" or (
        payload["stage"] == "ready" and authorized
    )
    return payload
