import pytest

from app.agent_runtime.context.compaction.service import CompactionError
from app.agent_runtime.context.compaction.validation import (
    validate_post_compaction_context,
)
from app.agent_runtime.context.types import ContextMessage


def _parts(static_content: str = "system") -> list[ContextMessage]:
    return [
        ContextMessage(
            role="system",
            content=static_content,
            metadata={"part": "system"},
        ),
        ContextMessage(
            role="user",
            content="original request",
            metadata={"part": "history", "seq": 1},
        ),
        ContextMessage(
            role="assistant",
            content="long answer",
            metadata={"part": "history", "seq": 2},
        ),
    ]


def test_validate_post_compaction_context_accepts_rebuilt_safe_context() -> None:
    budget = validate_post_compaction_context(
        _parts(),
        end_seq=2,
        summary="short summary",
        max_context_tokens=1_000,
    )

    assert budget.total_tokens > 0
    assert budget.history_tokens > 0
    assert budget.within_safe_zone is True


def test_validate_post_compaction_context_rejects_reserved_context_overflow() -> None:
    with pytest.raises(CompactionError) as exc_info:
        validate_post_compaction_context(
            _parts(static_content="system " * 100),
            end_seq=2,
            summary="short summary",
            max_context_tokens=10,
        )

    assert exc_info.value.code == "compaction_context_unsafe"
    assert "10" not in exc_info.value.message
