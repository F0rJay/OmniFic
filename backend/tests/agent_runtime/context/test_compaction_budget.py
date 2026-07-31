from app.agent_runtime.context.compaction.budget import (
    calculate_auto_compaction_budget,
    calculate_post_compaction_budget,
)
from app.agent_runtime.context.types import ContextMessage


def _part(part: str, content: str) -> ContextMessage:
    return ContextMessage(
        role="user" if part == "history" else "system",
        content=content,
        metadata={"part": part},
    )


def test_auto_compaction_budget_excludes_non_history_tokens(
    monkeypatch,
) -> None:
    token_counts = {
        "system": 50,
        "rules": 20,
        "runtime": 10,
        "history": 15,
    }

    def fake_count_context_tokens(messages) -> int:
        return sum(token_counts[message.content] for message in messages)

    monkeypatch.setattr(
        "app.agent_runtime.context.compaction.budget.count_context_tokens",
        fake_count_context_tokens,
    )
    parts = [
        _part("system", "system"),
        _part("rules", "rules"),
        _part("runtime", "runtime"),
        _part("history", "history"),
    ]

    budget = calculate_auto_compaction_budget(parts, max_context_tokens=100)

    assert budget.history_tokens == 15
    assert budget.reserved_tokens == 80
    assert budget.available_history_tokens == 20
    assert budget.trigger_tokens == 16
    assert budget.trigger_reached is False


def test_auto_compaction_budget_triggers_at_dynamic_history_threshold(
    monkeypatch,
) -> None:
    token_counts = {"system": 60, "history": 32}

    def fake_count_context_tokens(messages) -> int:
        return sum(token_counts[message.content] for message in messages)

    monkeypatch.setattr(
        "app.agent_runtime.context.compaction.budget.count_context_tokens",
        fake_count_context_tokens,
    )

    budget = calculate_auto_compaction_budget(
        [_part("system", "system"), _part("history", "history")],
        max_context_tokens=100,
    )

    assert budget.available_history_tokens == 40
    assert budget.trigger_tokens == 32
    assert budget.trigger_reached is True


def test_auto_compaction_budget_requires_real_history(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.agent_runtime.context.compaction.budget.count_context_tokens",
        lambda messages: sum(100 for _message in messages),
    )

    budget = calculate_auto_compaction_budget(
        [_part("system", "system")],
        max_context_tokens=100,
    )

    assert budget.available_history_tokens == 0
    assert budget.trigger_tokens == 0
    assert budget.trigger_reached is False


def test_post_compaction_budget_requires_history_below_trigger(monkeypatch) -> None:
    token_counts = {"system": 70, "safe": 23, "at-trigger": 24}

    def fake_count_context_tokens(messages) -> int:
        return sum(token_counts[message.content] for message in messages)

    monkeypatch.setattr(
        "app.agent_runtime.context.compaction.budget.count_context_tokens",
        fake_count_context_tokens,
    )

    safe = calculate_post_compaction_budget(
        [_part("system", "system"), _part("history", "safe")],
        max_context_tokens=100,
    )
    unsafe = calculate_post_compaction_budget(
        [_part("system", "system"), _part("history", "at-trigger")],
        max_context_tokens=100,
    )

    assert safe.total_tokens == 93
    assert safe.safe_history_tokens == 24
    assert safe.within_safe_zone is True
    assert unsafe.total_tokens == 94
    assert unsafe.within_safe_zone is False


def test_post_compaction_budget_rejects_reserved_context_overflow(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.agent_runtime.context.compaction.budget.count_context_tokens",
        lambda messages: sum(100 for _message in messages),
    )

    budget = calculate_post_compaction_budget(
        [_part("system", "system")],
        max_context_tokens=100,
    )

    assert budget.history_tokens == 0
    assert budget.total_tokens == 100
    assert budget.within_safe_zone is False
