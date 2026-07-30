"""Persist an Auditor pass/fail result against the current artifact snapshot."""

import json
from typing import Literal

from pydantic import BaseModel, Field

from app.agent_runtime.tools.base import AgentTool
from app.agent_runtime.tools.errors import ToolExecutionError
from app.agent_runtime.tools.registry import ToolRegistry
from app.storage.database import create_session
from app.storage.services import writing_readiness_service


class SubmitWritingReadinessReviewInput(BaseModel):
    status: Literal["pass", "fail"] = Field(description="审查结论")
    summary: str = Field(description="精炼的总体审查结论")
    issues: list[str] = Field(default_factory=list, description="必须解决的问题；通过时应为空")


@ToolRegistry.register
class SubmitWritingReadinessReviewTool(AgentTool):
    name: str = "submit_writing_readiness_review"
    description: str = (
        "Auditor 专用：将当前项目开写准入审查的 pass/fail、摘要和问题清单"
        "绑定到当前世界书、角色与大纲资料快照。"
    )
    access_level: str = "write"
    args_schema: type[BaseModel] = SubmitWritingReadinessReviewInput

    async def _execute(
        self,
        status: Literal["pass", "fail"],
        summary: str,
        issues: list[str],
    ) -> str:
        if self._state.get("active_agent") != "auditor":
            raise ToolExecutionError("只有 Auditor 可以提交开写准入审查")
        session = await create_session()
        try:
            payload = await writing_readiness_service.submit_review(
                session,
                self.project_id,
                status=status,
                summary=summary,
                issues=issues,
            )
            await session.commit()
            return json.dumps(payload, ensure_ascii=False, default=str)
        except writing_readiness_service.WritingReadinessConflict as exc:
            await session.rollback()
            raise ToolExecutionError(f"{exc}: {'；'.join(exc.blockers)}") from exc
        finally:
            await session.close()
