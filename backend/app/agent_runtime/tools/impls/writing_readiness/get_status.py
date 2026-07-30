"""Read the current project's Agent writing-readiness status."""

import json

from pydantic import BaseModel

from app.agent_runtime.tools.base import AgentTool
from app.agent_runtime.tools.registry import ToolRegistry
from app.storage.database import create_session
from app.storage.services import writing_readiness_service


class GetWritingReadinessInput(BaseModel):
    pass


@ToolRegistry.register
class GetWritingReadinessTool(AgentTool):
    name: str = "get_writing_readiness"
    description: str = (
        "读取当前项目的正文开写准备状态、缺失资料、审查结果和当前回合授权状态。"
        "规划新小说或准备委派 Writer 前必须调用。"
    )
    access_level: str = "readonly"
    args_schema: type[BaseModel] = GetWritingReadinessInput

    async def _execute(self) -> str:
        session = await create_session()
        try:
            revision_id = self._state.get("current_revision_id")
            payload = await writing_readiness_service.get_agent_status(
                session,
                self.project_id,
                revision_id=revision_id if isinstance(revision_id, str) else None,
            )
            return json.dumps(payload, ensure_ascii=False, default=str)
        finally:
            await session.close()
