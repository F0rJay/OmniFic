from __future__ import annotations

from loguru import logger

from app.agent_runtime.context.compaction.budget import (
    PostCompactionBudget,
    calculate_post_compaction_budget,
)
from app.agent_runtime.context.compaction.overlay import preview_compaction_overlay
from app.agent_runtime.context.compaction.service import CompactionError
from app.agent_runtime.context.compaction.config import COMPACT_USER_MESSAGE_MAX_TOKENS
from app.agent_runtime.context.compaction.tokens import count_text_tokens
from app.agent_runtime.context.types import ContextMessage


def _is_history(message: ContextMessage) -> bool:
    return (message.metadata or {}).get("part") == "history"


def _is_retained_user_message(message: ContextMessage, *, end_seq: int) -> bool:
    if message.role != "user":
        return False
    metadata = message.metadata or {}
    seq = metadata.get("seq")
    return (
        metadata.get("kind") != "compaction_summary"
        and type(seq) is int
        and seq <= end_seq
    )


def validate_post_compaction_context(
    parts: list[ContextMessage],
    *,
    end_seq: int,
    summary: str,
    max_context_tokens: int,
    retained_user_max_tokens: int = COMPACT_USER_MESSAGE_MAX_TOKENS,
    log_unsafe: bool = True,
) -> PostCompactionBudget:
    reserved = [message for message in parts if not _is_history(message)]
    history = [message for message in parts if _is_history(message)]
    rebuilt_history = preview_compaction_overlay(
        history,
        end_seq=end_seq,
        summary=summary,
        retained_user_max_tokens=retained_user_max_tokens,
    )
    rebuilt_parts = [
        *reserved,
        *rebuilt_history,
    ]
    retained_user_tokens = sum(
        count_text_tokens(message.content)
        for message in rebuilt_history
        if _is_retained_user_message(message, end_seq=end_seq)
    )
    budget = calculate_post_compaction_budget(
        rebuilt_parts,
        max_context_tokens=max_context_tokens,
        retained_user_tokens=retained_user_tokens,
    )
    if not budget.within_safe_zone and log_unsafe:
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
    if not budget.within_safe_zone:
        raise CompactionError(
            "compaction_context_unsafe",
            "压缩后上下文仍超出安全范围，当前请求已中止",
        )
    return budget
