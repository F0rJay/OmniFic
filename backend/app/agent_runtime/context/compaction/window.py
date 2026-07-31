from __future__ import annotations

from dataclasses import dataclass
from typing import NoReturn

from app.agent_runtime.context.compaction.tokens import count_context_tokens
from app.agent_runtime.context.types import ContextMessage
from app.agent_runtime.persistence.compaction_types import PersistedCompaction


class CompactionNoWindowError(Exception):
    code = "no_compactable_window"


@dataclass(frozen=True)
class CompactionWindow:
    start_seq: int
    end_seq: int
    messages: list[ContextMessage]
    source_input_tokens: int
    generation: int = 1


def _seq(message: ContextMessage) -> int | None:
    seq = (message.metadata or {}).get("seq")
    if type(seq) is int:
        return seq
    return None


def _raise_no_window() -> NoReturn:
    raise CompactionNoWindowError(CompactionNoWindowError.code)


def _lower_bound(
    history_messages: list[ContextMessage],
    existing_compactions: list[PersistedCompaction],
) -> int:
    if existing_compactions:
        return max(compaction.end_seq for compaction in existing_compactions) + 1

    seqs = [seq for message in history_messages if (seq := _seq(message)) is not None]
    if seqs:
        return min(seqs)
    _raise_no_window()


def select_compaction_window(
    history_messages: list[ContextMessage],
    existing_compactions: list[PersistedCompaction],
    max_context_tokens: int,
) -> CompactionWindow:
    # Codex local compaction summarizes the complete effective history. The
    # persisted range is only the new raw-message checkpoint since the previous
    # compaction, which keeps OmniFic's append-only audit records non-overlapping.
    del max_context_tokens
    lower_bound = _lower_bound(history_messages, existing_compactions)
    new_sequenced_messages = [
        message
        for message in history_messages
        if (seq := _seq(message)) is not None and seq >= lower_bound
    ]
    if not new_sequenced_messages:
        _raise_no_window()

    window_messages = list(history_messages)
    source_input_tokens = count_context_tokens(window_messages)
    checkpoint_seqs = [
        seq
        for message in new_sequenced_messages
        if (seq := _seq(message)) is not None
    ]

    return CompactionWindow(
        start_seq=min(checkpoint_seqs),
        end_seq=max(checkpoint_seqs),
        messages=window_messages,
        source_input_tokens=source_input_tokens,
        generation=max(
            (compaction.generation for compaction in existing_compactions),
            default=0,
        )
        + 1,
    )
