from __future__ import annotations

import json
import math
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Literal

import tiktoken
from langchain_core.utils.function_calling import convert_to_openai_tool

from app.agent_runtime.context.types import ContextMessage
from app.core.utils.tiktoken import get_encoding


TokenCounterSource = Literal[
    "model_tokenizer",
    "compatible_estimate",
    "fallback_estimate",
]

_DEFAULT_OUTPUT_RESERVE_TOKENS = 4_096
_OPENAI_PROVIDER_TYPES = {"openai", "azure-openai"}
_OPENAI_COMPATIBLE_PROVIDER_TYPES = {
    "deepseek",
    "groq",
    "huggingface",
    "mistral",
    "nvidia-ai-endpoints",
    "ollama",
    "openai-compatible",
    "openrouter",
}


def _json_text(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
        default=str,
    )


@dataclass(frozen=True)
class ModelTokenEstimator:
    encoding_name: str
    source: TokenCounterSource
    estimate_multiplier: float = 1.0
    tokens_per_message: int = 3
    request_overhead_tokens: int = 3

    def _count(self, value: str) -> int:
        raw_tokens = len(get_encoding(self.encoding_name).encode(value))
        return math.ceil(raw_tokens * self.estimate_multiplier)

    def count_text(self, value: str) -> int:
        return self._count(value)

    def count_messages(self, messages: Iterable[ContextMessage]) -> int:
        total = 0
        for message in messages:
            total += self.tokens_per_message
            total += self._count(message.role)
            total += self._count(message.content or "")
            if message.name:
                total += self._count(message.name)
            if message.tool_call_id:
                total += self._count(message.tool_call_id)
            if message.tool_calls:
                total += self._count(_json_text(message.tool_calls))
            if message.additional_kwargs:
                total += self._count(_json_text(message.additional_kwargs))
        return total

    def count_tools(self, tools: Sequence[Any] | None) -> int:
        if not tools:
            return 0

        schemas: list[dict[str, Any]] = []
        for tool in tools:
            try:
                schema = convert_to_openai_tool(tool)
            except (TypeError, ValueError):
                schema = {
                    "type": "function",
                    "function": {
                        "name": str(getattr(tool, "name", type(tool).__name__)),
                        "description": str(getattr(tool, "description", "")),
                        "parameters": {},
                    },
                }
            schemas.append(schema)
        return self._count(_json_text(schemas))


@dataclass(frozen=True)
class ModelTokenBudgetPolicy:
    estimator: ModelTokenEstimator
    output_reserve_tokens: int
    safety_margin_tokens: int

    @property
    def counter_source(self) -> TokenCounterSource:
        return self.estimator.source

    @property
    def encoding_name(self) -> str:
        return self.estimator.encoding_name


def _encoding_for_openai_model(model_id: str) -> str:
    normalized = model_id.strip()
    if not normalized:
        return "o200k_base"
    try:
        return tiktoken.encoding_for_model(normalized).name
    except KeyError:
        return "o200k_base"


def _estimator_for_model(
    *,
    provider_type: str,
    model_id: str,
) -> ModelTokenEstimator:
    provider = provider_type.strip().lower()
    if provider in _OPENAI_PROVIDER_TYPES:
        return ModelTokenEstimator(
            encoding_name=_encoding_for_openai_model(model_id),
            source="model_tokenizer",
        )
    if provider in _OPENAI_COMPATIBLE_PROVIDER_TYPES:
        return ModelTokenEstimator(
            encoding_name=_encoding_for_openai_model(model_id),
            source="compatible_estimate",
            estimate_multiplier=1.1,
        )
    return ModelTokenEstimator(
        encoding_name="o200k_base",
        source="fallback_estimate",
        estimate_multiplier=1.2,
    )


def _positive_int(value: Any) -> int | None:
    return value if type(value) is int and value > 0 else None


def _safety_margin(
    *,
    max_context_tokens: int,
    source: TokenCounterSource,
) -> int:
    if source == "model_tokenizer":
        return max(512, math.ceil(max_context_tokens * 0.01))
    if source == "compatible_estimate":
        return max(1_024, math.ceil(max_context_tokens * 0.03))
    return max(2_048, math.ceil(max_context_tokens * 0.05))


def build_model_token_budget_policy(
    model_config: Mapping[str, Any],
    *,
    max_context_tokens: int,
) -> ModelTokenBudgetPolicy:
    provider_type = str(model_config.get("provider_type") or "")
    model_id = str(model_config.get("model_id") or "")
    estimator = _estimator_for_model(
        provider_type=provider_type,
        model_id=model_id,
    )
    output_reserve = (
        _positive_int(model_config.get("max_tokens")) or _DEFAULT_OUTPUT_RESERVE_TOKENS
    )
    return ModelTokenBudgetPolicy(
        estimator=estimator,
        output_reserve_tokens=output_reserve,
        safety_margin_tokens=_safety_margin(
            max_context_tokens=max(max_context_tokens, 0),
            source=estimator.source,
        ),
    )
