from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.agent_runtime.context.parts.task_goal import build_task_goal


@pytest.mark.asyncio
async def test_build_task_goal_returns_none_when_empty() -> None:
    with patch(
        "app.agent_runtime.context.parts.task_goal.task_service.get_task",
        new=AsyncMock(return_value=SimpleNamespace(goal=None)),
    ):
        assert await build_task_goal("task-1", AsyncMock()) is None


@pytest.mark.asyncio
async def test_build_task_goal_returns_system_context() -> None:
    with patch(
        "app.agent_runtime.context.parts.task_goal.task_service.get_task",
        new=AsyncMock(return_value=SimpleNamespace(goal="完成本章高潮")),
    ):
        message = await build_task_goal("task-1", AsyncMock())

    assert message is not None
    assert message.role == "system"
    assert message.content == "<task_goal>\n完成本章高潮\n</task_goal>"
    assert message.metadata == {"part": "task_goal"}
