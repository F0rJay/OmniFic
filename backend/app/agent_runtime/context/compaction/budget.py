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
