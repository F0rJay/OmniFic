"""add compaction strategy

Revision ID: 1021
Revises: 1020
Create Date: 2026-07-31 13:30:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1021"
down_revision: Union[str, Sequence[str], None] = "1020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("agent_context_compactions") as batch_op:
        batch_op.add_column(
            sa.Column(
                "strategy",
                sa.String(length=20),
                server_default="llm_summary",
                nullable=False,
            )
        )

    with op.batch_alter_table("agent_context_compactions") as batch_op:
        batch_op.create_check_constraint(
            "ck_agent_context_compactions_strategy_valid",
            "strategy IN ('llm_summary', 'token_budget')",
        )
        batch_op.create_index(
            "ix_agent_context_compactions_strategy",
            ["strategy"],
            unique=False,
        )
        batch_op.alter_column(
            "strategy",
            existing_type=sa.String(length=20),
            server_default=None,
        )


def downgrade() -> None:
    with op.batch_alter_table("agent_context_compactions") as batch_op:
        batch_op.drop_index("ix_agent_context_compactions_strategy")
        batch_op.drop_constraint(
            "ck_agent_context_compactions_strategy_valid",
            type_="check",
        )
        batch_op.drop_column("strategy")
