import json

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_runtime.tools.base import HookContext
from app.agent_runtime.tools.errors import ToolExecutionError
from app.agent_runtime.tools.hooks.writing_readiness import writing_readiness_gate_hook
from app.agent_runtime.tools.impls.writing_readiness.authorize import (
    AuthorizeWritingRequestTool,
    has_explicit_writing_intent,
    request_supports_writing_excerpt,
)
from app.agent_runtime.tools.impls.writing_readiness.submit_review import (
    SubmitWritingReadinessReviewTool,
)
from app.storage.models.character import Character
from app.storage.models.note import Note
from app.storage.models.world_info_entry import WorldInfoEntry
from app.storage.repos import (
    character_repo,
    note_repo,
    world_info_entry_repo,
    world_info_repo,
    writing_readiness_repo,
)
from app.storage.services import writing_readiness_service


async def _create_project(client: AsyncClient) -> tuple[str, str]:
    project_response = await client.post(
        "/api/v1/projects",
        data={"title": "准入测试小说", "description": "从零开始"},
    )
    project_id = project_response.json()["id"]
    await client.get(f"/api/v1/projects/{project_id}/world-info")
    volumes_response = await client.get(f"/api/v1/projects/{project_id}/volumes")
    return project_id, volumes_response.json()[0]["id"]


async def _create_required_artifacts(
    session: AsyncSession,
    project_id: str,
) -> Note:
    world_info = await world_info_repo.get_by_project_id(session, project_id)
    assert world_info is not None
    await world_info_entry_repo.create(
        session,
        WorldInfoEntry(
            world_info_id=world_info.id,
            uid=1,
            name="世界规则",
            order=1,
            content="核心冲突、势力、时间线和不可违反设定。",
        ),
    )
    await character_repo.create(
        session,
        Character(project_id=project_id, name="主角", description="承担核心冲突"),
    )
    macro = await note_repo.create(
        session,
        Note(
            project_id=project_id,
            title="全书总纲",
            content="结局、主线、关键转折、人物弧光和伏笔回收。",
        ),
    )
    await note_repo.create(
        session,
        Note(
            project_id=project_id,
            title="开篇细纲",
            content="剧情单元、目标、冲突、结果、变化与节拍。",
        ),
    )
    return macro


@pytest.mark.asyncio
async def test_blank_project_is_locked(client: AsyncClient) -> None:
    project_id, _ = await _create_project(client)
    response = await client.get(f"/api/v1/projects/{project_id}/writing-readiness")
    assert response.status_code == 200
    data = response.json()
    assert data["stage"] == "worldbuilding"
    assert data["ready_to_start"] is False
    assert {item["id"] for item in data["requirements"] if not item["ready"]} == {
        "core_worldbook",
        "main_characters",
        "macro_outline",
        "opening_outline",
    }


@pytest.mark.asyncio
async def test_passed_current_review_enters_ready_without_confirmation(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    project_id, _ = await _create_project(client)
    await _create_required_artifacts(session, project_id)

    await writing_readiness_service.submit_review(
        session,
        project_id,
        status="pass",
        summary="资料完整且一致",
        issues=[],
    )
    ready = await client.get(f"/api/v1/projects/{project_id}/writing-readiness")
    assert ready.json()["stage"] == "ready"
    assert ready.json()["ready_to_start"] is True
    assert "can_agent_write" not in ready.json()
    assert "approved_at" not in ready.json()


@pytest.mark.asyncio
async def test_failed_review_remains_in_review(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    project_id, _ = await _create_project(client)
    await _create_required_artifacts(session, project_id)
    await writing_readiness_service.submit_review(
        session,
        project_id,
        status="fail",
        summary="开篇细纲不可执行",
        issues=["开篇细纲缺少关键转折"],
    )

    response = await client.get(f"/api/v1/projects/{project_id}/writing-readiness")
    assert response.status_code == 200
    assert response.json()["stage"] == "review"
    assert "开篇细纲缺少关键转折" in response.json()["blockers"]

    removed_endpoint = await client.post(
        f"/api/v1/projects/{project_id}/writing-readiness/confirm"
    )
    assert removed_endpoint.status_code == 404


@pytest.mark.asyncio
async def test_only_auditor_can_submit_review_tool() -> None:
    tool = SubmitWritingReadinessReviewTool(
        _state={"project_id": "project-id", "active_agent": "build"}
    )
    with pytest.raises(ToolExecutionError, match="只有 Auditor"):
        await tool._execute(status="fail", summary="未通过", issues=["缺少总纲"])


@pytest.mark.asyncio
async def test_artifact_change_invalidates_review_before_first_chapter(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    project_id, _ = await _create_project(client)
    macro = await _create_required_artifacts(session, project_id)
    await writing_readiness_service.submit_review(
        session,
        project_id,
        status="pass",
        summary="通过",
        issues=[],
    )
    await writing_readiness_service.authorize_current_request(
        session,
        project_id,
        revision_id="revision-1",
    )

    macro.content += "新增重大转折。"
    await note_repo.update_note(session, macro)
    status = await writing_readiness_service.get_status(session, project_id)
    assert status["stage"] == "review"
    assert status["is_stale"] is True
    agent_status = await writing_readiness_service.get_agent_status(
        session,
        project_id,
        revision_id="revision-1",
    )
    assert agent_status["can_agent_write"] is False
    assert agent_status["authorized_for_current_request"] is False


@pytest.mark.asyncio
async def test_agent_gate_blocks_content_but_allows_title_only_edit(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    project_id, _ = await _create_project(client)
    config = {"configurable": {"db_session": session}}
    write_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="write_chapter",
            access_level="write",
            args={"title": "第一章", "content": "正文"},
            state={"project_id": project_id},
            config=config,
        )
    )
    assert write_result.proceed is False
    payload = json.loads(write_result.output or "{}")
    assert payload["code"] == "writing_readiness_required"

    edit_content_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="edit_chapter",
            access_level="write",
            args={"old_content": "旧正文", "new_content": "新正文"},
            state={"project_id": project_id, "active_agent": "writer"},
            config=config,
        )
    )
    assert edit_content_result.proceed is False
    assert json.loads(edit_content_result.output or "{}")["code"] == (
        "writing_readiness_required"
    )

    dispatch_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="dispatch_subagent",
            access_level="readonly",
            args={"agent_type": "writer"},
            state={"project_id": project_id, "active_agent": "build"},
            config=config,
        )
    )
    assert dispatch_result.proceed is False
    assert json.loads(dispatch_result.output or "{}")["code"] == (
        "writing_readiness_required"
    )

    title_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="edit_chapter",
            access_level="write",
            args={"new_title": "新标题", "old_content": None, "new_content": None},
            state={"project_id": project_id},
            config=config,
        )
    )
    assert title_result.proceed is True


@pytest.mark.asyncio
async def test_agent_gate_requires_current_authorization_and_writer(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    project_id, _ = await _create_project(client)
    await _create_required_artifacts(session, project_id)
    await writing_readiness_service.submit_review(
        session,
        project_id,
        status="pass",
        summary="资料完整且可执行",
        issues=[],
    )
    await writing_readiness_service.authorize_current_request(
        session,
        project_id,
        revision_id="revision-1",
    )

    unbound_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="write_chapter",
            access_level="write",
            args={"title": "第一章", "content": "正文"},
            state={
                "project_id": project_id,
                "active_agent": "writer",
                "current_revision_id": "revision-2",
            },
            config={"configurable": {"db_session": session}},
        )
    )
    assert unbound_result.proceed is False
    assert json.loads(unbound_result.output or "{}")["code"] == "writing_start_request_required"

    primary_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="write_chapter",
            access_level="write",
            args={"title": "第一章", "content": "正文"},
            state={
                "project_id": project_id,
                "active_agent": "build",
                "current_revision_id": "revision-1",
            },
            config={"configurable": {"db_session": session}},
        )
    )
    assert primary_result.proceed is False
    assert json.loads(primary_result.output or "{}")["code"] == "writer_required"

    dispatch_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="dispatch_subagent",
            access_level="readonly",
            args={"agent_type": "writer"},
            state={
                "project_id": project_id,
                "active_agent": "build",
                "current_revision_id": "revision-1",
            },
            config={"configurable": {"db_session": session}},
        )
    )
    assert dispatch_result.proceed is True

    writer_result = await writing_readiness_gate_hook(
        HookContext(
            tool_name="write_chapter",
            access_level="write",
            args={"title": "第一章", "content": "正文"},
            state={
                "project_id": project_id,
                "active_agent": "writer",
                "current_revision_id": "revision-1",
            },
            config={"configurable": {"db_session": session}},
        )
    )
    assert writer_result.proceed is True


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("现在开始写正文", True),
        ("请写第一章", True),
        ("continue writing the next chapter", True),
        ("帮我从头设计一本小说", False),
        ("先不要写正文，只完善大纲", False),
    ],
)
def test_explicit_writing_intent_detection(text: str, expected: bool) -> None:
    assert has_explicit_writing_intent(text) is expected


@pytest.mark.parametrize(
    ("user_text", "excerpt", "expected"),
    [
        ("不要开始写正文，只完善大纲", "开始写正文", False),
        ("先不要写第一章，改为写第二章", "写第二章", True),
        ("Design the novel; then write the first chapter", "write the first chapter", True),
        ("Do not write the first chapter", "write the first chapter", False),
    ],
)
def test_writing_excerpt_cannot_bypass_negation(
    user_text: str,
    excerpt: str,
    expected: bool,
) -> None:
    assert request_supports_writing_excerpt(user_text, excerpt) is expected


@pytest.mark.asyncio
async def test_authorize_tool_requires_current_request_excerpt() -> None:
    tool = AuthorizeWritingRequestTool(
        _state={
            "project_id": "project-id",
            "active_agent": "build",
            "user_request": "现在开始写正文",
            "current_revision_id": "revision-1",
        }
    )
    with pytest.raises(ToolExecutionError, match="原样来自当前用户消息"):
        await tool._execute(request_excerpt="请写第一章")


@pytest.mark.asyncio
async def test_authorize_tool_rejects_positive_fragment_from_negative_request() -> None:
    tool = AuthorizeWritingRequestTool(
        _state={
            "project_id": "project-id",
            "active_agent": "build",
            "user_request": "先不要开始写正文，只完善大纲",
            "current_revision_id": "revision-1",
        }
    )
    with pytest.raises(ToolExecutionError, match="没有明确要求"):
        await tool._execute(request_excerpt="开始写正文")


@pytest.mark.asyncio
async def test_manual_chapter_enters_writing_mode(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    project_id, volume_id = await _create_project(client)
    response = await client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={
            "volume_id": volume_id,
            "title": "第一章",
            "content": "用户手动写下的正文。",
            "word_count": 9,
        },
    )
    assert response.status_code == 201
    readiness = await client.get(f"/api/v1/projects/{project_id}/writing-readiness")
    assert readiness.json()["stage"] == "writing"
    assert readiness.json()["ready_to_start"] is False

    world_info = await world_info_repo.get_by_project_id(session, project_id)
    assert world_info is not None
    await world_info_entry_repo.create(
        session,
        WorldInfoEntry(
            world_info_id=world_info.id,
            uid=1,
            name="写作后的设定调整",
            order=1,
            content="进入滚动写作后补充的设定。",
        ),
    )
    after_change = await client.get(f"/api/v1/projects/{project_id}/writing-readiness")
    assert after_change.json()["stage"] == "writing"
    assert after_change.json()["ready_to_start"] is False


@pytest.mark.asyncio
async def test_delete_project_removes_writing_readiness(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    project_id, _ = await _create_project(client)
    await _create_required_artifacts(session, project_id)
    await writing_readiness_service.submit_review(
        session,
        project_id,
        status="pass",
        summary="通过",
        issues=[],
    )
    assert await writing_readiness_repo.get_by_project(session, project_id) is not None

    response = await client.delete(f"/api/v1/projects/{project_id}")
    assert response.status_code == 204
    assert await writing_readiness_repo.get_by_project(session, project_id) is None
