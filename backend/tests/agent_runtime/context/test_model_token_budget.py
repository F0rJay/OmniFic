from __future__ import annotations

from app.agent_runtime.context.compaction.budget import (
    calculate_auto_compaction_budget,
    calculate_post_compaction_budget,
)
from app.agent_runtime.context.compaction.token_estimator import (
    ModelTokenBudgetPolicy,
    ModelTokenEstimator,
    build_model_token_budget_policy,
)
from app.agent_runtime.context.types import ContextMessage


def _message(
    role: str,
    content: str,
    *,
    part: str,
    **kwargs,
) -> ContextMessage:
    return ContextMessage(
        role=role,
        content=content,
        metadata={"part": part},
        **kwargs,
    )  # type: ignore[arg-type]


def test_openai_policy_selects_model_tokenizer_and_configured_output_budget() -> None:
    modern = build_model_token_budget_policy(
        {
            "provider_type": "openai",
            "model_id": "gpt-4o",
            "max_tokens": 8_192,
        },
        max_context_tokens=128_000,
    )
    legacy = build_model_token_budget_policy(
        {"provider_type": "openai", "model_id": "gpt-4"},
        max_context_tokens=8_192,
    )

    assert modern.counter_source == "model_tokenizer"
    assert modern.encoding_name == "o200k_base"
    assert modern.output_reserve_tokens == 8_192
    assert modern.safety_margin_tokens == 1_280
    assert legacy.encoding_name == "cl100k_base"
    assert legacy.output_reserve_tokens == 4_096


def test_unknown_provider_uses_conservative_fallback_policy() -> None:
    policy = build_model_token_budget_policy(
        {"provider_type": "private-gateway", "model_id": "custom-model"},
        max_context_tokens=100_000,
    )

    assert policy.counter_source == "fallback_estimate"
    assert policy.encoding_name == "o200k_base"
    assert policy.estimator.estimate_multiplier == 1.2
    assert policy.safety_margin_tokens == 5_000


def test_estimator_counts_message_envelopes_tool_calls_and_tool_schemas() -> None:
    estimator = ModelTokenEstimator(
        encoding_name="o200k_base",
        source="model_tokenizer",
    )
    plain = _message("assistant", "done", part="history")
    tool_call = _message(
        "assistant",
        "done",
        part="history",
        tool_calls=[
            {
                "id": "call-1",
                "name": "write_file",
                "args": {"path": "draft.txt", "content": "chapter " * 200},
            }
        ],
    )
    tools = [
        {
            "name": "lookup",
            "description": "Look up a named item. " * 20,
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
        }
    ]

    assert estimator.count_messages([plain]) > estimator.count_text("done")
    assert estimator.count_messages([tool_call]) > estimator.count_messages([plain])
    assert estimator.count_tools(tools) > 0


def test_model_budget_reserves_tools_output_and_estimation_margin() -> None:
    estimator = ModelTokenEstimator(
        encoding_name="o200k_base",
        source="model_tokenizer",
        request_overhead_tokens=7,
    )
    policy = ModelTokenBudgetPolicy(
        estimator=estimator,
        output_reserve_tokens=100,
        safety_margin_tokens=50,
    )
    system = _message("system", "system instructions", part="system")
    history = _message("user", "continue the task", part="history")
    tools = [
        {
            "name": "search",
            "description": "Search project files",
            "parameters": {"type": "object", "properties": {}},
        }
    ]

    budget = calculate_auto_compaction_budget(
        [system, history],
        max_context_tokens=1_000,
        tools=tools,
        policy=policy,
    )

    assert budget.effective_input_limit == 850
    assert budget.tool_schema_tokens == estimator.count_tools(tools)
    assert budget.request_overhead_tokens == 7
    assert budget.available_history_tokens == (
        850
        - budget.reserved_tokens
        - budget.tool_schema_tokens
        - budget.request_overhead_tokens
    )
    assert budget.estimated_input_tokens == (
        budget.history_tokens
        + budget.reserved_tokens
        + budget.tool_schema_tokens
        + budget.request_overhead_tokens
    )
    assert budget.metrics()["counter_source"] == "model_tokenizer"


def test_post_compaction_uses_effective_input_limit_not_raw_context_limit() -> None:
    estimator = ModelTokenEstimator(
        encoding_name="o200k_base",
        source="model_tokenizer",
    )
    policy = ModelTokenBudgetPolicy(
        estimator=estimator,
        output_reserve_tokens=400,
        safety_margin_tokens=100,
    )
    large_static = _message("system", "fixed context " * 300, part="system")

    budget = calculate_post_compaction_budget(
        [large_static],
        max_context_tokens=1_000,
        policy=policy,
    )

    assert budget.total_tokens < budget.max_context_tokens
    assert budget.total_tokens >= budget.effective_input_limit
    assert budget.within_safe_zone is False
