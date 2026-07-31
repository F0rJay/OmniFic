from __future__ import annotations

import asyncio
import inspect
import json
import random
import re
from collections.abc import Awaitable, Callable, Iterator, Mapping
from dataclasses import dataclass
from typing import Any, Literal, cast

import httpx
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_runtime.context.compaction.budget import PostCompactionBudget
from app.agent_runtime.context.compaction.tokens import count_text_tokens
from app.agent_runtime.context.compaction.turns import LLMTurn, group_llm_turns
from app.agent_runtime.context.compaction.window import CompactionWindow
from app.agent_runtime.context.processors.to_langchain import to_langchain_messages
from app.agent_runtime.context.types import ContextMessage
from app.agent_runtime.graph.state import AgentRuntimeState
from app.agent_runtime.model_config import to_client_model_config
from app.agent_runtime.persistence import compaction_repo
from app.agent_runtime.persistence import repo as message_repo
from app.agent_runtime.persistence.compaction_types import (
    CompactionStrategy,
    CompactionTrigger,
    PersistedCompaction,
)
from app.agent_runtime.persistence.errors import PersistenceWriteError
from app.models.clients.model_factory import ModelConfig, create_chat_model
from app.storage.services import prompt_chain_service


EventSink = Callable[[str, dict[str, Any]], Awaitable[None] | None]
UsageSink = Callable[[dict[str, Any]], Awaitable[None] | None]
ResultValidator = Callable[
    [str],
    Awaitable[PostCompactionBudget | None] | PostCompactionBudget | None,
]
PromptRole = Literal["system", "user", "assistant"]

_SURROGATE_RE = re.compile(r"[\ud800-\udfff]")
_CONTEXT_WINDOW_ERROR_PATTERNS = (
    "context_length_exceeded",
    "context window exceeded",
    "maximum context length",
    "maximum context window",
    "prompt is too long",
    "input is too long",
    "too many tokens",
    "token limit exceeded",
)
_MAX_TRANSIENT_RETRIES = 3
_INITIAL_RETRY_DELAY_SECONDS = 0.2
_RETRY_BACKOFF_FACTOR = 2.0
_RETRY_JITTER_RANGE = (0.9, 1.1)
_RETRYABLE_HTTP_STATUS_CODES = {408, 429}
_TOKEN_BUDGET_FALLBACK_CODES = {
    "prompt_error",
    "llm_error",
    "compaction_empty_summary",
    "compaction_context_unsafe",
}


class CompactionError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass(frozen=True)
class CompactionLifecycleContext:
    session_id: str
    task_id: str
    trigger: CompactionTrigger
    start_seq: int
    end_seq: int
    source_input_tokens: int
    generation: int
    compaction: PersistedCompaction | None = None


@dataclass(frozen=True)
class TokenBudgetCompactionResult:
    summary: str
    budget: PostCompactionBudget
    dropped_turn_count: int
    dropped_message_count: int
    strategy: Literal["token_budget"] = "token_budget"


CompactionHook = Callable[
    [CompactionLifecycleContext],
    Awaitable[bool | None] | bool | None,
]
TokenBudgetFallback = Callable[
    [CompactionError],
    Awaitable[TokenBudgetCompactionResult] | TokenBudgetCompactionResult,
]


@dataclass(frozen=True)
class _CompactionCandidate:
    summary: str
    usage: dict[str, Any] | None
    token_input: int
    token_output: int
    token_cache: int
    summary_tokens: int
    validation_budget: PostCompactionBudget | None
    dropped_turn_count: int
    dropped_message_count: int
    strategy: CompactionStrategy
    fallback_reason: str | None = None


@dataclass
class _CompactionLifecycleState:
    phase: str = "pre_compact"
    compaction: PersistedCompaction | None = None


async def compact_window(
    db_session: AsyncSession,
    *,
    state: AgentRuntimeState | dict[str, Any],
    window: CompactionWindow,
    trigger: CompactionTrigger,
    event_sink: EventSink | None = None,
    usage_sink: UsageSink | None = None,
    model_config: Mapping[str, Any] | None = None,
    result_validator: ResultValidator | None = None,
    pre_compact_hook: CompactionHook | None = None,
    post_compact_hook: CompactionHook | None = None,
    cancel_event: asyncio.Event | None = None,
    token_budget_fallback: TokenBudgetFallback | None = None,
) -> PersistedCompaction:
    session_id = str(state.get("session_id") or "")
    task_id = str(state.get("task_id") or "")
    lifecycle = _CompactionLifecycleState()

    try:
        return await _compact_window_impl(
            db_session,
            state=state,
            window=window,
            trigger=trigger,
            event_sink=event_sink,
            usage_sink=usage_sink,
            model_config=model_config,
            result_validator=result_validator,
            pre_compact_hook=pre_compact_hook,
            post_compact_hook=post_compact_hook,
            cancel_event=cancel_event,
            token_budget_fallback=token_budget_fallback,
            lifecycle=lifecycle,
        )
    except asyncio.CancelledError:
        compaction = lifecycle.compaction
        await _emit_event(
            event_sink,
            "agent:compaction_cancelled",
            {
                "session_id": session_id,
                "task_id": task_id,
                "trigger": trigger,
                "start_seq": window.start_seq,
                "end_seq": window.end_seq,
                "source_input_tokens": window.source_input_tokens,
                "generation": window.generation,
                "phase": lifecycle.phase,
                "persisted": compaction is not None,
                "compaction_id": compaction.id if compaction is not None else None,
                "strategy": compaction.strategy if compaction is not None else None,
                "model_input_tokens": (
                    compaction.model_input_tokens if compaction is not None else 0
                ),
                "summary_tokens": (
                    compaction.summary_tokens if compaction is not None else 0
                ),
                "post_compaction_tokens": (
                    compaction.post_compaction_tokens if compaction is not None else 0
                ),
                "retained_user_tokens": (
                    compaction.retained_user_tokens if compaction is not None else 0
                ),
                "dropped_turn_count": (
                    compaction.dropped_turn_count if compaction is not None else 0
                ),
                "dropped_message_count": (
                    compaction.dropped_message_count if compaction is not None else 0
                ),
            },
        )
        raise


async def _compact_window_impl(
    db_session: AsyncSession,
    *,
    state: AgentRuntimeState | dict[str, Any],
    window: CompactionWindow,
    trigger: CompactionTrigger,
    event_sink: EventSink | None,
    usage_sink: UsageSink | None,
    model_config: Mapping[str, Any] | None,
    result_validator: ResultValidator | None,
    pre_compact_hook: CompactionHook | None,
    post_compact_hook: CompactionHook | None,
    cancel_event: asyncio.Event | None,
    token_budget_fallback: TokenBudgetFallback | None,
    lifecycle: _CompactionLifecycleState,
) -> PersistedCompaction:
    session_id = str(state.get("session_id") or "")
    task_id = str(state.get("task_id") or "")
    project_id = str(state.get("project_id") or "")

    await _emit_event(
        event_sink,
        "agent:compaction_start",
        {
            "session_id": session_id,
            "task_id": task_id,
            "trigger": trigger,
            "start_seq": window.start_seq,
            "end_seq": window.end_seq,
            "source_input_tokens": window.source_input_tokens,
            "generation": window.generation,
        },
    )

    _raise_if_cancelled(cancel_event)
    try:
        await _run_compaction_hook(
            pre_compact_hook,
            _lifecycle_context(
                session_id=session_id,
                task_id=task_id,
                trigger=trigger,
                window=window,
            ),
            cancel_event=cancel_event,
            error_code="pre_compact_hook_failed",
            error_message="压缩前置钩子执行失败，当前请求已中止",
        )
    except CompactionError as exc:
        await _emit_error(
            event_sink,
            session_id=session_id,
            task_id=task_id,
            trigger=trigger,
            error=exc,
        )
        raise

    try:
        candidate = await _build_llm_candidate(
            db_session,
            state=state,
            window=window,
            model_config=model_config,
            result_validator=result_validator,
            cancel_event=cancel_event,
            lifecycle=lifecycle,
        )
    except CompactionError as exc:
        if token_budget_fallback is None or exc.code not in _TOKEN_BUDGET_FALLBACK_CODES:
            await _emit_error(
                event_sink,
                session_id=session_id,
                task_id=task_id,
                trigger=trigger,
                error=exc,
            )
            raise
        try:
            candidate = await _build_token_budget_candidate(
                token_budget_fallback,
                reason=exc,
                cancel_event=cancel_event,
                lifecycle=lifecycle,
            )
        except CompactionError as fallback_error:
            await _emit_error(
                event_sink,
                session_id=session_id,
                task_id=task_id,
                trigger=trigger,
                error=fallback_error,
            )
            raise
        await _emit_event(
            event_sink,
            "agent:compaction_fallback",
            {
                "session_id": session_id,
                "task_id": task_id,
                "trigger": trigger,
                "strategy": candidate.strategy,
                "reason": exc.code,
                "start_seq": window.start_seq,
                "end_seq": window.end_seq,
                "source_input_tokens": window.source_input_tokens,
                "generation": window.generation,
                "post_compaction_tokens": (
                    candidate.validation_budget.total_tokens
                    if candidate.validation_budget is not None
                    else 0
                ),
                "retained_user_tokens": (
                    candidate.validation_budget.retained_user_tokens
                    if candidate.validation_budget is not None
                    else 0
                ),
            },
        )

    summary = candidate.summary
    usage = candidate.usage
    token_input = candidate.token_input
    token_output = candidate.token_output
    token_cache = candidate.token_cache
    summary_tokens = candidate.summary_tokens
    validation_budget = candidate.validation_budget
    dropped_turn_count = candidate.dropped_turn_count
    dropped_message_count = candidate.dropped_message_count

    lifecycle.phase = "persistence"
    _raise_if_cancelled(cancel_event)
    try:
        result = await compaction_repo.insert_compaction(
            db_session,
            session_id=session_id,
            task_id=task_id,
            project_id=project_id,
            start_seq=window.start_seq,
            end_seq=window.end_seq,
            summary=summary,
            trigger=trigger,
            strategy=candidate.strategy,
            source_input_tokens=window.source_input_tokens,
            summary_tokens=summary_tokens,
            generation=window.generation,
            model_input_tokens=token_input,
            post_compaction_tokens=(
                validation_budget.total_tokens if validation_budget is not None else 0
            ),
            retained_user_tokens=(
                validation_budget.retained_user_tokens
                if validation_budget is not None
                else 0
            ),
            dropped_turn_count=dropped_turn_count,
            dropped_message_count=dropped_message_count,
        )
    except PersistenceWriteError as exc:
        logger.opt(exception=True).error("Failed to persist compaction")
        code = (
            "compaction_conflict"
            if "compaction_conflict" in str(exc)
            else "compaction_persist_failed"
        )
        message = (
            "压缩范围已被写入，当前请求已中止"
            if code == "compaction_conflict"
            else "压缩结果写入失败，当前请求已中止"
        )
        error = CompactionError(code, message)
        await _emit_error(
            event_sink,
            session_id=session_id,
            task_id=task_id,
            trigger=trigger,
            error=error,
        )
        raise error from exc

    lifecycle.compaction = result

    try:
        await _persist_display_marker(
            db_session,
            compaction=result,
            trigger=trigger,
        )
    except PersistenceWriteError as exc:
        logger.opt(exception=True).error("Failed to persist compaction display marker")
        error = CompactionError(
            "compaction_display_persist_failed",
            "压缩显示消息写入失败，当前请求已中止",
        )
        await _emit_error(
            event_sink,
            session_id=session_id,
            task_id=task_id,
            trigger=trigger,
            error=error,
        )
        raise error from exc

    await _emit_usage(
        usage_sink,
        _usage_payload(
            usage=usage,
            session_id=session_id,
            task_id=task_id,
            trigger=trigger,
            token_input=token_input,
            token_output=token_output,
            token_cache=token_cache,
        ),
    )

    lifecycle.phase = "post_compact"
    try:
        await _run_compaction_hook(
            post_compact_hook,
            _lifecycle_context(
                session_id=session_id,
                task_id=task_id,
                trigger=trigger,
                window=window,
                compaction=result,
            ),
            cancel_event=cancel_event,
            error_code="post_compact_hook_failed",
            error_message="压缩后置钩子执行失败，当前请求已中止",
        )
    except CompactionError as exc:
        await _emit_error(
            event_sink,
            session_id=session_id,
            task_id=task_id,
            trigger=trigger,
            error=exc,
        )
        raise

    await _emit_event(
        event_sink,
        "agent:compaction_success",
        {
            "session_id": session_id,
            "task_id": task_id,
            "compaction_id": result.id,
            "trigger": trigger,
            "start_seq": result.start_seq,
            "end_seq": result.end_seq,
            "source_input_tokens": result.source_input_tokens,
            "summary_tokens": result.summary_tokens,
            "generation": result.generation,
            "model_input_tokens": result.model_input_tokens,
            "post_compaction_tokens": result.post_compaction_tokens,
            "retained_user_tokens": result.retained_user_tokens,
            "dropped_turn_count": result.dropped_turn_count,
            "dropped_message_count": result.dropped_message_count,
            "strategy": result.strategy,
            "fallback_reason": candidate.fallback_reason,
        },
    )
    lifecycle.phase = "completed"
    return result


async def _build_llm_candidate(
    db_session: AsyncSession,
    *,
    state: AgentRuntimeState | dict[str, Any],
    window: CompactionWindow,
    model_config: Mapping[str, Any] | None,
    result_validator: ResultValidator | None,
    cancel_event: asyncio.Event | None,
    lifecycle: _CompactionLifecycleState,
) -> _CompactionCandidate:
    lifecycle.phase = "prompt_build"
    _raise_if_cancelled(cancel_event)
    try:
        prompt_messages = await _build_prompt_messages(db_session)
        source_turns = group_llm_turns(window.messages)
        messages = _build_compaction_messages(prompt_messages, source_turns)
    except CompactionError:
        raise
    except Exception as exc:
        logger.opt(exception=True).error("Failed to build compaction prompt")
        raise CompactionError(
            "prompt_error",
            "压缩提示词加载失败，当前请求已中止",
        ) from exc

    try:
        effective_model_config = (
            dict(model_config) if model_config is not None else _model_config(state)
        )
        model = create_chat_model(
            ModelConfig(**to_client_model_config(effective_model_config))
        )
    except CompactionError:
        raise
    except Exception as exc:
        logger.opt(exception=True).error("Compaction LLM client creation failed")
        raise CompactionError("llm_error", "压缩失败，当前请求已中止") from exc

    transient_retries = 0
    dropped_turn_count = 0
    dropped_message_count = 0
    while True:
        lifecycle.phase = "model_request"
        try:
            response = await _await_with_cancellation(
                model.ainvoke(messages),
                cancel_event,
            )
            break
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            if _is_context_window_exceeded(exc) and source_turns:
                dropped_turn = source_turns.pop(0)
                dropped_turn_count += 1
                dropped_message_count += len(dropped_turn.messages)
                messages = _build_compaction_messages(prompt_messages, source_turns)
                transient_retries = 0
                logger.warning(
                    "Context window exceeded while compacting; "
                    "removed oldest history unit and retrying"
                )
                continue

            if (
                _is_transient_llm_error(exc)
                and transient_retries < _MAX_TRANSIENT_RETRIES
            ):
                transient_retries += 1
                delay = _retry_delay(transient_retries)
                logger.warning(
                    "Transient compaction LLM failure; retrying in {:.3f}s ({}/{})",
                    delay,
                    transient_retries,
                    _MAX_TRANSIENT_RETRIES,
                )
                lifecycle.phase = "retry_backoff"
                await _await_with_cancellation(asyncio.sleep(delay), cancel_event)
                continue

            logger.opt(exception=True).error("Compaction LLM request failed")
            raise CompactionError("llm_error", "压缩失败，当前请求已中止") from exc

    summary = _summary_from_response(response)
    validation_budget: PostCompactionBudget | None = None
    if result_validator is not None:
        lifecycle.phase = "result_validation"
        _raise_if_cancelled(cancel_event)
        try:
            validation = result_validator(summary)
            if inspect.isawaitable(validation):
                validation = await _await_with_cancellation(validation, cancel_event)
            if isinstance(validation, PostCompactionBudget):
                validation_budget = validation
        except asyncio.CancelledError:
            raise
        except CompactionError:
            raise
        except Exception as exc:
            logger.opt(exception=True).error("Failed to validate compacted context")
            raise CompactionError(
                "compaction_validation_failed",
                "压缩结果校验失败，当前请求已中止",
            ) from exc

    usage = _extract_usage(response)
    token_input, token_output, token_cache = _token_counts(usage)
    return _CompactionCandidate(
        summary=summary,
        usage=usage,
        token_input=token_input,
        token_output=token_output,
        token_cache=token_cache,
        summary_tokens=max(token_output, 0),
        validation_budget=validation_budget,
        dropped_turn_count=dropped_turn_count,
        dropped_message_count=dropped_message_count,
        strategy="llm_summary",
    )


async def _build_token_budget_candidate(
    fallback: TokenBudgetFallback,
    *,
    reason: CompactionError,
    cancel_event: asyncio.Event | None,
    lifecycle: _CompactionLifecycleState,
) -> _CompactionCandidate:
    lifecycle.phase = "token_budget_fallback"
    _raise_if_cancelled(cancel_event)
    try:
        result = fallback(reason)
        if inspect.isawaitable(result):
            result = await _await_with_cancellation(result, cancel_event)
    except asyncio.CancelledError:
        raise
    except CompactionError:
        raise
    except Exception as exc:
        logger.opt(exception=True).error("Token-budget compaction fallback failed")
        raise CompactionError(
            "compaction_token_budget_failed",
            "应急压缩失败，当前请求已中止",
        ) from exc

    _raise_if_cancelled(cancel_event)
    if not isinstance(result, TokenBudgetCompactionResult):
        raise CompactionError(
            "compaction_token_budget_failed",
            "应急压缩失败，当前请求已中止",
        )
    if not result.summary.strip() or not result.budget.within_safe_zone:
        raise CompactionError(
            "compaction_token_budget_exhausted",
            "必要上下文已占满模型窗口，无法执行应急压缩",
        )
    return _CompactionCandidate(
        summary=result.summary,
        usage=None,
        token_input=0,
        token_output=0,
        token_cache=0,
        summary_tokens=count_text_tokens(result.summary),
        validation_budget=result.budget,
        dropped_turn_count=result.dropped_turn_count,
        dropped_message_count=result.dropped_message_count,
        strategy=result.strategy,
        fallback_reason=reason.code,
    )


def _lifecycle_context(
    *,
    session_id: str,
    task_id: str,
    trigger: CompactionTrigger,
    window: CompactionWindow,
    compaction: PersistedCompaction | None = None,
) -> CompactionLifecycleContext:
    return CompactionLifecycleContext(
        session_id=session_id,
        task_id=task_id,
        trigger=trigger,
        start_seq=window.start_seq,
        end_seq=window.end_seq,
        source_input_tokens=window.source_input_tokens,
        generation=window.generation,
        compaction=compaction,
    )


def _raise_if_cancelled(cancel_event: asyncio.Event | None) -> None:
    if cancel_event is not None and cancel_event.is_set():
        raise asyncio.CancelledError


async def _await_with_cancellation(
    awaitable: Awaitable[Any],
    cancel_event: asyncio.Event | None,
) -> Any:
    if cancel_event is None:
        return await awaitable

    if cancel_event.is_set():
        if isinstance(awaitable, asyncio.Future):
            awaitable.cancel()
            await asyncio.gather(awaitable, return_exceptions=True)
        else:
            close = getattr(awaitable, "close", None)
            if callable(close):
                close()
        raise asyncio.CancelledError
    operation = asyncio.ensure_future(awaitable)
    cancellation = asyncio.create_task(cancel_event.wait())
    try:
        done, _pending = await asyncio.wait(
            {operation, cancellation},
            return_when=asyncio.FIRST_COMPLETED,
        )
        if cancellation in done:
            raise asyncio.CancelledError
        return await operation
    finally:
        if not operation.done():
            operation.cancel()
        if not cancellation.done():
            cancellation.cancel()
        await asyncio.gather(operation, cancellation, return_exceptions=True)


async def _run_compaction_hook(
    hook: CompactionHook | None,
    context: CompactionLifecycleContext,
    *,
    cancel_event: asyncio.Event | None,
    error_code: str,
    error_message: str,
) -> None:
    _raise_if_cancelled(cancel_event)
    if hook is None:
        return
    try:
        outcome = hook(context)
        if inspect.isawaitable(outcome):
            outcome = await _await_with_cancellation(outcome, cancel_event)
    except asyncio.CancelledError:
        raise
    except CompactionError:
        raise
    except Exception as exc:
        raise CompactionError(error_code, error_message) from exc
    if outcome is False:
        raise asyncio.CancelledError
    _raise_if_cancelled(cancel_event)


async def _persist_display_marker(
    db_session: AsyncSession,
    *,
    compaction: PersistedCompaction,
    trigger: CompactionTrigger,
) -> None:
    await message_repo.insert_message(
        db_session,
        session_id=compaction.session_id,
        task_id=compaction.task_id,
        project_id=compaction.project_id,
        role="system",
        status="complete",
        content="已进行压缩",
        message_type="compaction",
        display_channel="list",
        llm_visibility="hidden",
        metadata={
            "kind": "compaction",
            "compaction_id": compaction.id,
            "trigger": trigger,
            "strategy": compaction.strategy,
            "start_seq": compaction.start_seq,
            "end_seq": compaction.end_seq,
            "generation": compaction.generation,
            "source_input_tokens": compaction.source_input_tokens,
            "summary_tokens": compaction.summary_tokens,
            "model_input_tokens": compaction.model_input_tokens,
            "post_compaction_tokens": compaction.post_compaction_tokens,
            "retained_user_tokens": compaction.retained_user_tokens,
            "dropped_turn_count": compaction.dropped_turn_count,
            "dropped_message_count": compaction.dropped_message_count,
        },
        message_id=f"compaction:{compaction.id}",
        created_at=compaction.created_at,
    )


async def _build_prompt_messages(db_session: AsyncSession) -> list[BaseMessage]:
    version = await prompt_chain_service.get_latest_version_with_entries_or_default(
        db_session,
        prompt_id="session-compaction",
    )
    entries = sorted(
        (entry for entry in version.entries if entry.is_enabled),
        key=lambda entry: entry.order_index,
    )

    messages: list[BaseMessage] = []
    for entry in entries:
        content = entry.content
        if not content:
            continue
        role = entry.role
        if role not in {"system", "user", "assistant"}:
            raise CompactionError("prompt_error", "压缩提示词配置无效")
        messages.append(_to_langchain_message(cast(PromptRole, role), content))

    return messages


def _build_compaction_messages(
    prompt_messages: list[BaseMessage],
    source_turns: list[LLMTurn],
) -> list[BaseMessage]:
    source_messages: list[ContextMessage] = [
        message for turn in source_turns for message in turn.messages
    ]
    return [*prompt_messages, *to_langchain_messages(source_messages)]


def _to_langchain_message(role: PromptRole, content: str) -> BaseMessage:
    if role == "system":
        return SystemMessage(content=content)
    if role == "assistant":
        return AIMessage(content=content)
    return HumanMessage(content=content)


def _model_config(state: AgentRuntimeState | dict[str, Any]) -> dict[str, Any]:
    model_config = state.get("model_config")
    if not isinstance(model_config, Mapping):
        raise CompactionError("llm_error", "压缩失败，当前请求已中止")
    return dict(model_config)


def _summary_from_response(response: Any) -> str:
    content = getattr(response, "content", "")
    summary = _sanitize_surrogates(_content_to_text(content).strip()).strip()
    if not summary:
        raise CompactionError("compaction_empty_summary", "压缩结果为空")
    return summary


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    return str(content)


def _sanitize_surrogates(value: str) -> str:
    return _SURROGATE_RE.sub("", value)


def _is_context_window_exceeded(exc: Exception) -> bool:
    values: list[Any] = [str(exc)]
    for attribute in ("body", "code", "error", "message", "response"):
        value = getattr(exc, attribute, None)
        if value is None:
            continue
        if isinstance(value, str):
            values.append(value)
            continue
        try:
            values.append(json.dumps(value, ensure_ascii=False, default=str))
        except (TypeError, ValueError):
            values.append(str(value))

    text = " ".join(values).lower()
    return any(pattern in text for pattern in _CONTEXT_WINDOW_ERROR_PATTERNS)


def _exception_chain(exc: BaseException) -> Iterator[BaseException]:
    current: BaseException | None = exc
    seen: set[int] = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        yield current
        current = current.__cause__ or current.__context__


def _status_code(exc: BaseException) -> int | None:
    for candidate in _exception_chain(exc):
        values = [
            getattr(candidate, "status_code", None),
            getattr(getattr(candidate, "response", None), "status_code", None),
        ]
        code = getattr(candidate, "code", None)
        if callable(code):
            try:
                code = code()
            except Exception:
                code = None
        values.append(code)

        for value in values:
            if isinstance(value, bool):
                continue
            if isinstance(value, int):
                return value
            enum_value = getattr(value, "value", None)
            if isinstance(enum_value, int) and not isinstance(enum_value, bool):
                return enum_value
    return None


def _is_transient_llm_error(exc: Exception) -> bool:
    status_code = _status_code(exc)
    if status_code in _RETRYABLE_HTTP_STATUS_CODES:
        return True
    if status_code is not None and 500 <= status_code <= 599:
        return True

    transient_types = (ConnectionError, TimeoutError, httpx.TransportError)
    return any(
        isinstance(candidate, transient_types) for candidate in _exception_chain(exc)
    )


def _retry_delay(retry_number: int) -> float:
    exponent = max(retry_number - 1, 0)
    base_delay = _INITIAL_RETRY_DELAY_SECONDS * (_RETRY_BACKOFF_FACTOR**exponent)
    return base_delay * random.uniform(*_RETRY_JITTER_RANGE)


def _extract_usage(message: Any) -> dict[str, Any] | None:
    usage = getattr(message, "usage_metadata", None)
    if isinstance(usage, dict) and usage:
        return dict(usage)
    if usage is not None and hasattr(usage, "items"):
        usage_dict = dict(usage)
        if usage_dict:
            return usage_dict

    response_metadata = getattr(message, "response_metadata", None)
    if isinstance(response_metadata, dict):
        metadata_usage = response_metadata.get("usage") or response_metadata.get(
            "token_usage"
        )
        if isinstance(metadata_usage, dict) and metadata_usage:
            return dict(metadata_usage)
        if metadata_usage is not None and hasattr(metadata_usage, "items"):
            usage_dict = dict(metadata_usage)
            if usage_dict:
                return usage_dict
    return None


def _token_counts(usage: dict[str, Any] | None) -> tuple[int, int, int]:
    if not usage:
        return 0, 0, 0

    token_input = _first_int(usage, ("input_tokens", "prompt_tokens", "token_input"))
    token_output = _first_int(
        usage,
        ("output_tokens", "completion_tokens", "token_output"),
    )
    token_cache = _first_int(usage, ("cache_read_tokens", "token_cache"))

    input_details = usage.get("input_token_details")
    if token_cache == 0 and isinstance(input_details, Mapping):
        token_cache = _first_int(
            input_details,
            ("cache_read", "cached_tokens", "token_cache"),
        )

    return token_input, token_output, token_cache


def _usage_payload(
    *,
    usage: dict[str, Any] | None,
    session_id: str,
    task_id: str,
    trigger: CompactionTrigger,
    token_input: int,
    token_output: int,
    token_cache: int,
) -> dict[str, Any]:
    usage_dict = dict(usage or {})
    usage_dict.setdefault("input_tokens", token_input)
    usage_dict.setdefault("output_tokens", token_output)
    usage_dict.setdefault("cache_read_tokens", token_cache)
    return {
        "usage_kind": "compaction",
        "session_id": session_id,
        "task_id": task_id,
        "trigger": trigger,
        "usage": usage_dict,
        "token_input": token_input,
        "token_output": token_output,
        "token_cache": token_cache,
    }


def _first_int(mapping: Mapping[str, Any], keys: tuple[str, ...]) -> int:
    for key in keys:
        value = mapping.get(key)
        if isinstance(value, bool):
            continue
        if isinstance(value, int):
            return max(value, 0)
        if isinstance(value, float):
            return max(int(value), 0)
    return 0


async def _emit_event(
    sink: EventSink | None,
    name: str,
    payload: dict[str, Any],
) -> None:
    if sink is None:
        return
    try:
        result = sink(name, payload)
        if inspect.isawaitable(result):
            await result
    except Exception:
        logger.opt(exception=True).warning("Compaction event sink failed")


async def _emit_usage(
    sink: UsageSink | None,
    payload: dict[str, Any],
) -> None:
    if sink is None:
        return
    try:
        result = sink(payload)
        if inspect.isawaitable(result):
            await result
    except Exception:
        logger.opt(exception=True).warning("Compaction usage sink failed")


async def _emit_error(
    sink: EventSink | None,
    *,
    session_id: str,
    task_id: str,
    trigger: CompactionTrigger,
    error: CompactionError,
) -> None:
    await _emit_event(
        sink,
        "agent:compaction_error",
        {
            "session_id": session_id,
            "task_id": task_id,
            "trigger": trigger,
            "code": error.code,
            "message": error.message,
        },
    )
