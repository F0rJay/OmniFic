"""Authorize the current explicit user request to start the first prose draft."""

from __future__ import annotations

import json
import re

from pydantic import BaseModel, Field

from app.agent_runtime.tools.base import AgentTool
from app.agent_runtime.tools.errors import ToolExecutionError
from app.agent_runtime.tools.registry import ToolRegistry
from app.storage.database import create_session
from app.storage.services import writing_readiness_service


_CHINESE_TARGET = r"(?:正文|章节|第一章|下一章|第[一二三四五六七八九十百千万两0-9]+章)"
_CHINESE_ACTION = r"(?:开始|现在开始|直接开始|动笔|写|撰写|创作|续写|继续写)"
_POSITIVE_CHINESE = re.compile(
    rf"(?:{_CHINESE_ACTION}.{{0,12}}{_CHINESE_TARGET}|{_CHINESE_TARGET}.{{0,8}}{_CHINESE_ACTION})"
)
_NEGATIVE_CHINESE = re.compile(
    rf"(?:不|别|不要|无需|不用|暂不|先不|禁止|停止).{{0,10}}(?:{_CHINESE_ACTION}).{{0,12}}{_CHINESE_TARGET}"
)
_POSITIVE_ENGLISH = re.compile(
    r"\b(?:start|begin|write|draft|continue)\b.{0,32}\b(?:prose|chapter|manuscript)\b",
    re.IGNORECASE,
)
_NEGATIVE_ENGLISH = re.compile(
    r"\b(?:do not|don't|dont|not yet|stop)\b.{0,32}"
    r"\b(?:start|begin|write|draft|continue)\b.{0,32}\b(?:prose|chapter|manuscript)\b",
    re.IGNORECASE,
)
_CLAUSE_BOUNDARY = re.compile(r"[。！？!?；;，,\n\r]+")


def has_explicit_writing_intent(text: str) -> bool:
    normalized = " ".join(text.strip().split())
    if not normalized:
        return False
    if _NEGATIVE_CHINESE.search(normalized) or _NEGATIVE_ENGLISH.search(normalized):
        return False
    return bool(
        _POSITIVE_CHINESE.search(normalized)
        or _POSITIVE_ENGLISH.search(normalized)
    )


def request_supports_writing_excerpt(user_request: str, excerpt: str) -> bool:
    """Reject positive fragments clipped out of a negated user sentence."""
    if excerpt not in user_request or not has_explicit_writing_intent(excerpt):
        return False
    return any(
        excerpt in clause and has_explicit_writing_intent(clause)
        for clause in _CLAUSE_BOUNDARY.split(user_request)
    )


class AuthorizeWritingRequestInput(BaseModel):
    request_excerpt: str = Field(
        min_length=1,
        description="当前用户消息中明确要求开始或继续正文写作的原文片段",
    )


@ToolRegistry.register
class AuthorizeWritingRequestTool(AgentTool):
    name: str = "authorize_writing_request"
    description: str = (
        "仅当当前用户消息明确要求写正文、写某章或续写章节时，"
        "授权当前回合开始首次正文写作。泛化的小说策划或从零创作请求不能授权。"
    )
    access_level: str = "write"
    args_schema: type[BaseModel] = AuthorizeWritingRequestInput

    async def _execute(self, request_excerpt: str) -> str:
        if self._state.get("active_agent") not in {"build", "plan"}:
            raise ToolExecutionError("只有 Build 或 Plan 可以授权当前正文请求")

        user_request = str(self._state.get("user_request") or "")
        excerpt = request_excerpt.strip()
        if excerpt not in user_request:
            raise ToolExecutionError("授权依据必须原样来自当前用户消息")
        if not request_supports_writing_excerpt(user_request, excerpt):
            raise ToolExecutionError("当前用户消息没有明确要求开始正文写作")

        revision_id = self._state.get("current_revision_id")
        if not isinstance(revision_id, str) or not revision_id:
            raise ToolExecutionError("缺少当前用户回合，不能授权正文写作")

        session = await create_session()
        try:
            payload = await writing_readiness_service.authorize_current_request(
                session,
                self.project_id,
                revision_id=revision_id,
            )
            await session.commit()
            return json.dumps(payload, ensure_ascii=False, default=str)
        except writing_readiness_service.WritingReadinessConflict as exc:
            await session.rollback()
            raise ToolExecutionError(f"{exc}: {'；'.join(exc.blockers)}") from exc
        finally:
            await session.close()
