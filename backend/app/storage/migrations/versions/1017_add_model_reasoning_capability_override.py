"""add model reasoning capability override

Revision ID: 1017
Revises: 1016
Create Date: 2026-07-26 14:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1017"
down_revision: Union[str, Sequence[str], None] = "1016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("models") as batch_op:
        batch_op.add_column(
            sa.Column("reasoning_capability_override", sa.Boolean(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("models") as batch_op:
        batch_op.drop_column("reasoning_capability_override")
