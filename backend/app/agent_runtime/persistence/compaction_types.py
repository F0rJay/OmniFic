"""Agent context compaction persistence DTOs."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal


CompactionTrigger = Literal["auto", "manual"]
CompactionStrategy = Literal["llm_summary", "token_budget"]


@dataclass(frozen=True)
class PersistedCompaction:
    id: str
    session_id: str
    task_id: str
    project_id: str
    start_seq: int
    end_seq: int
    summary: str
    trigger: CompactionTrigger
    source_input_tokens: int
    summary_tokens: int
    created_at: datetime
    generation: int = 1
    strategy: CompactionStrategy = "llm_summary"
    model_input_tokens: int = 0
    post_compaction_tokens: int = 0
    retained_user_tokens: int = 0
    dropped_turn_count: int = 0
    dropped_message_count: int = 0


@dataclass(frozen=True)
class NewCompaction:
    session_id: str
    task_id: str
    project_id: str
    start_seq: int
    end_seq: int
    summary: str
    trigger: CompactionTrigger
    strategy: CompactionStrategy = "llm_summary"
    source_input_tokens: int = 0
    summary_tokens: int = 0
    generation: int = 1
    model_input_tokens: int = 0
    post_compaction_tokens: int = 0
    retained_user_tokens: int = 0
    dropped_turn_count: int = 0
    dropped_message_count: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
