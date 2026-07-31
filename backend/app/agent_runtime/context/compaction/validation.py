from __future__ import annotations

from loguru import logger

from app.agent_runtime.context.compaction.budget import (
    PostCompactionBudget,
    calculate_post_compaction_budget,
)
from app.agent_runtime.context.compaction.overlay import preview_compaction_overlay
from app.agent_runtime.context.compaction.service import CompactionError
from app.agent_runtime.context.types import ContextMessage


def _is_history(message: ContextMessage) -> bool:
    return (message.metadata or {}).get("part") == "history"


def validate_post_compaction_context(
    parts: list[ContextMessage],
    *,
    end_seq: int,
    summary: str,
    max_context_tokens: int,
) -> PostCompactionBudget:
    reserved = [message for message in parts if not _is_history(message)]
    history = [message for message in parts if _is_history(message)]
    rebuilt_parts = [
        *reserved,
        *preview_compaction_overlay(
            history,
            end_seq=end_seq,
            summary=summary,
        ),
    ]
    budget = calculate_post_compaction_budget(
        rebuilt_parts,
        max_context_tokens=max_context_tokens,
    )
    if not budget.within_safe_zone:
        logger.warning(
            "Post-compaction context remains outside safe zone: "
            "total_tokens={} max_context_tokens={} history_tokens={} "
            "safe_history_tokens={} reserved_tokens={}",
            budget.total_tokens,
            budget.max_context_tokens,
            budget.history_tokens,
            budget.safe_history_tokens,
            budget.reserved_tokens,
        )
        raise CompactionError(
            "compaction_context_unsafe",
            "压缩后上下文仍超出安全范围，当前请求已中止",
        )
    return budget
