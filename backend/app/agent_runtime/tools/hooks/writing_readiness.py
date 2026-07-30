"""Hard gate for Agent-authored chapter content."""

import json
from typing import cast

from langchain_core.runnables import RunnableConfig
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_runtime.tools.base import HookContext, HookResult
from app.storage.services import writing_readiness_service


def _extract_db_session(config: RunnableConfig | None) -> AsyncSession | None:
    if not isinstance(config, dict):
        return None
    configurable = config.get("configurable") or {}
    if not isinstance(configurable, dict):
        return None
    return cast(AsyncSession | None, configurable.get("db_session"))


async def writing_readiness_gate_hook(context: HookContext) -> HookResult:
    is_writer_dispatch = (
        context.tool_name == "dispatch_subagent"
        and context.args.get("agent_type") == "writer"
    )
    if context.tool_name == "edit_chapter":
        modifies_content = (
            context.args.get("old_content") is not None
            and context.args.get("new_content") is not None
        )
        if not modifies_content:
            return HookResult(proceed=True)
    elif context.tool_name != "write_chapter" and not is_writer_dispatch:
        return HookResult(proceed=True)

    session = _extract_db_session(context.config)
    if session is None:
        return HookResult(proceed=True)
    revision_id = context.state.get("current_revision_id")
    readiness = await writing_readiness_service.get_agent_status(
        session,
        str(context.state["project_id"]),
        revision_id=revision_id if isinstance(revision_id, str) else None,
    )
    if readiness["stage"] == "writing":
        return HookResult(proceed=True)
    if readiness["stage"] != "ready":
        return HookResult(
            proceed=False,
            output=json.dumps(
                {
                    "type": "tool_blocked",
                    "code": "writing_readiness_required",
                    "error": "项目尚未完成开写准备",
                    "message": "项目尚未完成世界书、主要角色、全书总纲、开篇细纲与 Auditor 审查，Agent 不能开始正文。",
                    "writing_readiness": readiness,
                },
                ensure_ascii=False,
                default=str,
            ),
        )
    if not readiness["authorized_for_current_request"]:
        return HookResult(
            proceed=False,
            output=json.dumps(
                {
                    "type": "tool_blocked",
                    "code": "writing_start_request_required",
                    "error": "当前用户回合未明确授权正文写作",
                    "message": "只有用户在当前消息中明确要求写正文或章节后，才能委派 Writer 或写入首次正文。",
                    "writing_readiness": readiness,
                },
                ensure_ascii=False,
                default=str,
            ),
        )
    if is_writer_dispatch:
        return HookResult(proceed=True)
    if context.state.get("active_agent") == "writer":
        return HookResult(proceed=True)
    return HookResult(
        proceed=False,
        output=json.dumps(
            {
                "type": "tool_blocked",
                "code": "writer_required",
                "error": "首次正文必须由 Writer 写入",
                "message": "当前回合已经获得正文授权，但首次正文必须先委派 Writer 完成。",
                "writing_readiness": readiness,
            },
            ensure_ascii=False,
            default=str,
        ),
    )
