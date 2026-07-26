from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_runtime.context.errors import ContextBuildError
from app.agent_runtime.context.types import ContextMessage
from app.storage.services import task_service


async def build_task_goal(
    task_id: str, db_session: AsyncSession
) -> ContextMessage | None:
    """构建当前任务目标上下文；未设置目标时返回 None。"""
    try:
        task = await task_service.get_task(db_session, task_id)
    except Exception as e:
        raise ContextBuildError("task_goal", "failed to load task goal", cause=e) from e

    goal = (task.goal or "").strip()
    if not goal:
        return None

    return ContextMessage(
        role="system",
        content=f"<task_goal>\n{goal}\n</task_goal>",
        metadata={"part": "task_goal"},
    )
