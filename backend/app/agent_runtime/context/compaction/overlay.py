from dataclasses import replace

from app.agent_runtime.context.compaction.config import (
    COMPACT_USER_MESSAGE_MAX_TOKENS,
)
from app.agent_runtime.context.compaction.tokens import count_text_tokens
from app.agent_runtime.context.types import ContextMessage
from app.agent_runtime.persistence.compaction_types import PersistedCompaction
from app.core.utils.tiktoken import get_encoding


def _seq(message: ContextMessage) -> int | None:
    seq = (message.metadata or {}).get("seq")
    if type(seq) is int:
        return seq
    return None


def _summary_message(
    *,
    summary: str,
    compaction_id: str,
) -> ContextMessage:
    return ContextMessage(
        role="user",
        content=f"<compaction-summary>\n{summary}\n</compaction-summary>",
        metadata={
            "part": "history",
            "kind": "compaction_summary",
            "compaction_id": compaction_id,
        },
    )


def _truncate_middle_to_tokens(value: str, max_tokens: int) -> str:
    encoding = get_encoding("o200k_base")
    tokens = encoding.encode(value)
    if len(tokens) <= max_tokens:
        return value

    left_budget = max_tokens // 2
    right_budget = max_tokens - left_budget
    left = encoding.decode(tokens[:left_budget]) if left_budget else ""
    right = encoding.decode(tokens[-right_budget:]) if right_budget else ""
    removed = len(tokens) - max_tokens
    return f"{left}…{removed} tokens truncated…{right}"


def _retained_user_messages(
    history_messages: list[ContextMessage],
    *,
    end_seq: int,
    max_tokens: int,
) -> list[ContextMessage]:
    candidates = [
        message
        for message in history_messages
        if message.role == "user"
        and (seq := _seq(message)) is not None
        and seq <= end_seq
    ]

    selected: list[ContextMessage] = []
    remaining = max_tokens
    for message in reversed(candidates):
        if remaining <= 0:
            break
        tokens = count_text_tokens(message.content)
        if tokens <= remaining:
            selected.append(message)
            remaining -= tokens
            continue
        selected.append(
            replace(
                message,
                content=_truncate_middle_to_tokens(message.content, remaining),
            )
        )
        break
    selected.reverse()
    return selected


def _is_compaction_summary(message: ContextMessage) -> bool:
    return (message.metadata or {}).get("kind") == "compaction_summary"


def _apply_compaction_overlay(
    history_messages: list[ContextMessage],
    *,
    end_seq: int,
    summary: str,
    compaction_id: str,
) -> list[ContextMessage]:
    output = _retained_user_messages(
        history_messages,
        end_seq=end_seq,
        max_tokens=COMPACT_USER_MESSAGE_MAX_TOKENS,
    )
    output.append(_summary_message(summary=summary, compaction_id=compaction_id))
    output.extend(
        message
        for message in history_messages
        if not _is_compaction_summary(message)
        and ((seq := _seq(message)) is None or seq > end_seq)
    )
    return output


def preview_compaction_overlay(
    history_messages: list[ContextMessage],
    *,
    end_seq: int,
    summary: str,
) -> list[ContextMessage]:
    """Rebuild the next history in memory before persisting its checkpoint."""
    return _apply_compaction_overlay(
        history_messages,
        end_seq=end_seq,
        summary=summary,
        compaction_id="pending",
    )


def apply_compaction_overlay(
    history_messages: list[ContextMessage],
    compactions: list[PersistedCompaction],
) -> list[ContextMessage]:
    if not compactions:
        return list(history_messages)

    # Each record is an append-only checkpoint. As in Codex, the latest
    # checkpoint replaces the whole compacted history instead of stacking every
    # historical summary into the next model request.
    latest = max(compactions, key=lambda item: (item.end_seq, item.created_at))
    return _apply_compaction_overlay(
        history_messages,
        end_seq=latest.end_seq,
        summary=latest.summary,
        compaction_id=latest.id,
    )
