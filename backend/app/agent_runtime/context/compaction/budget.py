from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from app.agent_runtime.context.compaction.config import AUTO_TRIGGER_RATIO
from app.agent_runtime.context.compaction.token_estimator import (
    ModelTokenBudgetPolicy,
    build_model_token_budget_policy,
)
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
    tool_schema_tokens: int = 0
    request_overhead_tokens: int = 0
    output_reserve_tokens: int = 0
    safety_margin_tokens: int = 0
    effective_input_limit: int = 0
    estimated_input_tokens: int = 0
    counter_source: str = "legacy"
    encoding_name: str = "o200k_base"

    @property
    def trigger_reached(self) -> bool:
        return (
            self.history_tokens > 0
            and self.available_history_tokens > 0
            and self.history_tokens >= self.trigger_tokens
        )

    def metrics(self) -> dict[str, int | str]:
        return {
            "history_tokens": self.history_tokens,
            "reserved_tokens": self.reserved_tokens,
            "available_history_tokens": self.available_history_tokens,
            "trigger_tokens": self.trigger_tokens,
            "tool_schema_tokens": self.tool_schema_tokens,
            "request_overhead_tokens": self.request_overhead_tokens,
            "output_reserve_tokens": self.output_reserve_tokens,
            "safety_margin_tokens": self.safety_margin_tokens,
            "effective_input_limit": self.effective_input_limit,
            "estimated_input_tokens": self.estimated_input_tokens,
            "counter_source": self.counter_source,
            "encoding_name": self.encoding_name,
        }


@dataclass(frozen=True)
class PostCompactionBudget:
    total_tokens: int
    history_tokens: int
    reserved_tokens: int
    max_context_tokens: int
    safe_history_tokens: int
    retained_user_tokens: int = 0
    tool_schema_tokens: int = 0
    request_overhead_tokens: int = 0
    output_reserve_tokens: int = 0
    safety_margin_tokens: int = 0
    effective_input_limit: int = -1
    counter_source: str = "legacy"
    encoding_name: str = "o200k_base"

    @property
    def within_safe_zone(self) -> bool:
        input_limit = (
            self.effective_input_limit
            if self.effective_input_limit >= 0
            else self.max_context_tokens
        )
        if input_limit <= 0 or self.total_tokens >= input_limit:
            return False
        return self.history_tokens == 0 or (
            self.history_tokens < self.safe_history_tokens
        )


def calculate_auto_compaction_budget(
    parts: list[ContextMessage],
    *,
    max_context_tokens: int,
    model_config: Mapping[str, Any] | None = None,
    tools: Sequence[Any] | None = None,
    policy: ModelTokenBudgetPolicy | None = None,
) -> AutoCompactionBudget:
    history = [message for message in parts if _is_history(message)]
    reserved = [message for message in parts if not _is_history(message)]
    effective_policy = policy
    if effective_policy is None and model_config is not None:
        effective_policy = build_model_token_budget_policy(
            model_config,
            max_context_tokens=max_context_tokens,
        )

    if effective_policy is None:
        history_tokens = count_context_tokens(history)
        reserved_tokens = count_context_tokens(reserved)
        tool_schema_tokens = 0
        request_overhead_tokens = 0
        output_reserve_tokens = 0
        safety_margin_tokens = 0
        counter_source = "legacy"
        encoding_name = "o200k_base"
    else:
        estimator = effective_policy.estimator
        history_tokens = estimator.count_messages(history)
        reserved_tokens = estimator.count_messages(reserved)
        tool_schema_tokens = estimator.count_tools(tools)
        request_overhead_tokens = estimator.request_overhead_tokens
        output_reserve_tokens = effective_policy.output_reserve_tokens
        safety_margin_tokens = effective_policy.safety_margin_tokens
        counter_source = effective_policy.counter_source
        encoding_name = effective_policy.encoding_name

    effective_input_limit = max(
        max_context_tokens - output_reserve_tokens - safety_margin_tokens,
        0,
    )
    fixed_input_tokens = reserved_tokens + tool_schema_tokens + request_overhead_tokens
    available_history_tokens = max(effective_input_limit - fixed_input_tokens, 0)
    trigger_tokens = int(available_history_tokens * AUTO_TRIGGER_RATIO)
    return AutoCompactionBudget(
        history_tokens=history_tokens,
        reserved_tokens=reserved_tokens,
        available_history_tokens=available_history_tokens,
        trigger_tokens=trigger_tokens,
        tool_schema_tokens=tool_schema_tokens,
        request_overhead_tokens=request_overhead_tokens,
        output_reserve_tokens=output_reserve_tokens,
        safety_margin_tokens=safety_margin_tokens,
        effective_input_limit=effective_input_limit,
        estimated_input_tokens=history_tokens + fixed_input_tokens,
        counter_source=counter_source,
        encoding_name=encoding_name,
    )


def calculate_post_compaction_budget(
    parts: list[ContextMessage],
    *,
    max_context_tokens: int,
    retained_user_tokens: int = 0,
    model_config: Mapping[str, Any] | None = None,
    tools: Sequence[Any] | None = None,
    policy: ModelTokenBudgetPolicy | None = None,
) -> PostCompactionBudget:
    budget = calculate_auto_compaction_budget(
        parts,
        max_context_tokens=max_context_tokens,
        model_config=model_config,
        tools=tools,
        policy=policy,
    )
    return PostCompactionBudget(
        total_tokens=budget.estimated_input_tokens,
        history_tokens=budget.history_tokens,
        reserved_tokens=budget.reserved_tokens,
        max_context_tokens=max_context_tokens,
        safe_history_tokens=budget.trigger_tokens,
        retained_user_tokens=retained_user_tokens,
        tool_schema_tokens=budget.tool_schema_tokens,
        request_overhead_tokens=budget.request_overhead_tokens,
        output_reserve_tokens=budget.output_reserve_tokens,
        safety_margin_tokens=budget.safety_margin_tokens,
        effective_input_limit=budget.effective_input_limit,
        counter_source=budget.counter_source,
        encoding_name=budget.encoding_name,
    )
