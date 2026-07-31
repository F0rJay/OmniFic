from __future__ import annotations

from app.agent_runtime.context.compaction.config import (
    COMPACT_USER_MESSAGE_MAX_TOKENS,
)
from app.agent_runtime.context.compaction.budget import PostCompactionBudget
from app.agent_runtime.context.compaction.overlay import preview_compaction_overlay
from app.agent_runtime.context.compaction.service import (
    CompactionError,
    TokenBudgetCompactionResult,
)
from app.agent_runtime.context.compaction.turns import group_llm_turns
from app.agent_runtime.context.compaction.validation import (
    validate_post_compaction_context,
)
from app.agent_runtime.context.types import ContextMessage


TOKEN_BUDGET_RESET_SUMMARY = (
    "上下文窗口已在摘要模型不可用时按 token 预算重置。"
    "旧的助手回复与工具调用已移除；请以当前系统提示、任务目标、规则、技能"
    "以及一并保留的最近用户指令为准继续任务。"
)


def _is_history(message: ContextMessage) -> bool:
    return (message.metadata or {}).get("part") == "history"


def _seq(message: ContextMessage) -> int | None:
    seq = (message.metadata or {}).get("seq")
    return seq if type(seq) is int else None


def _is_compaction_summary(message: ContextMessage) -> bool:
    return (message.metadata or {}).get("kind") == "compaction_summary"


def _budget_for_retention(
    parts: list[ContextMessage],
    *,
    end_seq: int,
    max_context_tokens: int,
    retained_user_max_tokens: int,
) -> PostCompactionBudget:
    return validate_post_compaction_context(
        parts,
        end_seq=end_seq,
        summary=TOKEN_BUDGET_RESET_SUMMARY,
        max_context_tokens=max_context_tokens,
        retained_user_max_tokens=retained_user_max_tokens,
        log_unsafe=False,
    )


def build_token_budget_compaction(
    parts: list[ContextMessage],
    *,
    end_seq: int,
    max_context_tokens: int,
) -> TokenBudgetCompactionResult:
    """Build a deterministic fresh window without calling a summary model."""
    if max_context_tokens <= 0:
        raise CompactionError(
            "compaction_token_budget_exhausted",
            "必要上下文已占满模型窗口，无法执行应急压缩",
        )

    try:
        best_budget = _budget_for_retention(
            parts,
            end_seq=end_seq,
            max_context_tokens=max_context_tokens,
            retained_user_max_tokens=0,
        )
    except CompactionError as exc:
        if exc.code != "compaction_context_unsafe":
            raise
        raise CompactionError(
            "compaction_token_budget_exhausted",
            "必要上下文已占满模型窗口，无法执行应急压缩",
        ) from exc

    low = 1
    high = min(COMPACT_USER_MESSAGE_MAX_TOKENS, max_context_tokens)
    while low <= high:
        candidate_retention = (low + high) // 2
        try:
            candidate_budget = _budget_for_retention(
                parts,
                end_seq=end_seq,
                max_context_tokens=max_context_tokens,
                retained_user_max_tokens=candidate_retention,
            )
        except CompactionError as exc:
            if exc.code != "compaction_context_unsafe":
                raise
            high = candidate_retention - 1
            continue
        best_budget = candidate_budget
        low = candidate_retention + 1

    history = [message for message in parts if _is_history(message)]
    compacted = [
        message
        for message in history
        if not _is_compaction_summary(message)
        and (seq := _seq(message)) is not None
        and seq <= end_seq
    ]
    rebuilt = preview_compaction_overlay(
        history,
        end_seq=end_seq,
        summary=TOKEN_BUDGET_RESET_SUMMARY,
        retained_user_max_tokens=best_budget.retained_user_tokens,
    )
    retained = [
        message
        for message in rebuilt
        if not _is_compaction_summary(message)
        and message.role == "user"
        and (seq := _seq(message)) is not None
        and seq <= end_seq
    ]

    return TokenBudgetCompactionResult(
        summary=TOKEN_BUDGET_RESET_SUMMARY,
        budget=best_budget,
        dropped_turn_count=max(
            len(group_llm_turns(compacted)) - len(retained),
            0,
        ),
        dropped_message_count=max(len(compacted) - len(retained), 0),
    )
