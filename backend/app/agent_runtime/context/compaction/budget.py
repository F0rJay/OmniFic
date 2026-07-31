from __future__ import annotations

from dataclasses import dataclass

from app.agent_runtime.context.compaction.config import AUTO_TRIGGER_RATIO
from app.agent_runtime.context.compaction.tokens import count_context_tokens
from app.agent_runtime.context.types import ContextMessage


def _is_history(message: ContextMessage) -> bool:
    return (message.metadata or {}).get("part") == "history"


@dataclass(frozen=True)
class AutoCompactionBudget:
    history_tokens: int
    reserved_tokens: int
    available_history_tokens: int
    trigger_tokens: int

    @property
    def trigger_reached(self) -> bool:
        return self.history_tokens > 0 and self.history_tokens >= self.trigger_tokens


@dataclass(frozen=True)
class PostCompactionBudget:
    total_tokens: int
    history_tokens: int
    reserved_tokens: int
    max_context_tokens: int
    safe_history_tokens: int

    @property
    def within_safe_zone(self) -> bool:
        if self.max_context_tokens <= 0 or self.total_tokens >= self.max_context_tokens:
            return False
        return self.history_tokens == 0 or (
            self.history_tokens < self.safe_history_tokens
        )


def calculate_auto_compaction_budget(
    parts: list[ContextMessage],
    *,
    max_context_tokens: int,
) -> AutoCompactionBudget:
    history = [message for message in parts if _is_history(message)]
    reserved = [message for message in parts if not _is_history(message)]
    history_tokens = count_context_tokens(history)
    reserved_tokens = count_context_tokens(reserved)
    available_history_tokens = max(max_context_tokens - reserved_tokens, 0)
    trigger_tokens = int(available_history_tokens * AUTO_TRIGGER_RATIO)
    return AutoCompactionBudget(
        history_tokens=history_tokens,
        reserved_tokens=reserved_tokens,
        available_history_tokens=available_history_tokens,
        trigger_tokens=trigger_tokens,
    )


def calculate_post_compaction_budget(
    parts: list[ContextMessage],
    *,
    max_context_tokens: int,
) -> PostCompactionBudget:
    budget = calculate_auto_compaction_budget(
        parts,
        max_context_tokens=max_context_tokens,
    )
    return PostCompactionBudget(
        total_tokens=budget.history_tokens + budget.reserved_tokens,
        history_tokens=budget.history_tokens,
        reserved_tokens=budget.reserved_tokens,
        max_context_tokens=max_context_tokens,
        safe_history_tokens=budget.trigger_tokens,
    )
