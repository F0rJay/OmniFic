from __future__ import annotations

import pytest

from app.agent_runtime.context.compaction.service import CompactionError
from app.agent_runtime.context.compaction.token_budget import (
    build_token_budget_compaction,
)
from app.agent_runtime.context.types import ContextMessage


def _message(role: str, content: str, *, part: str, seq: int | None = None):
    metadata: dict[str, object] = {"part": part}
    if seq is not None:
        metadata["seq"] = seq
    return ContextMessage(role=role, content=content, metadata=metadata)  # type: ignore[arg-type]


def test_token_budget_compaction_rebuilds_safe_window_from_current_state() -> None:
    parts = [
        _message("system", "current system instructions", part="system"),
        _message("system", "current task goal", part="task_goal"),
        _message("user", "old request " * 80, part="history", seq=1),
        _message("assistant", "obsolete answer " * 80, part="history", seq=2),
        _message("user", "latest request", part="history", seq=3),
        _message("assistant", "latest answer " * 80, part="history", seq=4),
    ]

    fallback = build_token_budget_compaction(
        parts,
        end_seq=4,
        max_context_tokens=120,
    )

    assert fallback.strategy == "token_budget"
    assert fallback.budget.within_safe_zone is True
    assert fallback.budget.total_tokens < 120
    assert fallback.budget.retained_user_tokens > 0
    assert fallback.dropped_turn_count > 0
    assert fallback.dropped_message_count > 0
    assert "token 预算" in fallback.summary


def test_token_budget_compaction_fails_when_static_state_exhausts_window() -> None:
    parts = [
        _message("system", "static " * 200, part="system"),
        _message("user", "request", part="history", seq=1),
    ]

    with pytest.raises(CompactionError) as exc_info:
        build_token_budget_compaction(
            parts,
            end_seq=1,
            max_context_tokens=20,
        )

    assert exc_info.value.code == "compaction_token_budget_exhausted"
