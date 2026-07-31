"""add compaction window metrics

Revision ID: 1020
Revises: 1019
Create Date: 2026-07-31 12:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1020"
down_revision: Union[str, Sequence[str], None] = "1019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_METRIC_COLUMNS = (
    "model_input_tokens",
    "post_compaction_tokens",
    "retained_user_tokens",
    "dropped_turn_count",
    "dropped_message_count",
)


def upgrade() -> None:
    with op.batch_alter_table("agent_context_compactions") as batch_op:
        batch_op.add_column(
            sa.Column("generation", sa.Integer(), server_default="1", nullable=False)
        )
        for name in _METRIC_COLUMNS:
            batch_op.add_column(
                sa.Column(name, sa.Integer(), server_default="0", nullable=False)
            )

    op.execute(
        sa.text(
            "UPDATE agent_context_compactions AS target SET generation = ("
            "SELECT COUNT(*) FROM agent_context_compactions AS source "
            "WHERE source.session_id = target.session_id AND ("
            "source.end_seq < target.end_seq OR ("
            "source.end_seq = target.end_seq AND source.created_at <= target.created_at"
            ")))"
        )
    )

    with op.batch_alter_table("agent_context_compactions") as batch_op:
        batch_op.create_check_constraint(
            "ck_agent_context_compactions_generation_positive",
            "generation >= 1",
        )
        for name in _METRIC_COLUMNS:
            batch_op.create_check_constraint(
                f"ck_agent_context_compactions_{name}_nonnegative",
                f"{name} >= 0",
            )
        batch_op.alter_column(
            "generation",
            existing_type=sa.Integer(),
            server_default=None,
        )
        for name in _METRIC_COLUMNS:
            batch_op.alter_column(
                name,
                existing_type=sa.Integer(),
                server_default=None,
            )


def downgrade() -> None:
    with op.batch_alter_table("agent_context_compactions") as batch_op:
        batch_op.drop_constraint(
            "ck_agent_context_compactions_generation_positive",
            type_="check",
        )
        for name in _METRIC_COLUMNS:
            batch_op.drop_constraint(
                f"ck_agent_context_compactions_{name}_nonnegative",
                type_="check",
            )
        for name in reversed(_METRIC_COLUMNS):
            batch_op.drop_column(name)
        batch_op.drop_column("generation")
