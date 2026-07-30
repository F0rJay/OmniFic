"""add project writing readiness workflow

Revision ID: 1018
Revises: 1017
Create Date: 2026-07-30 00:00:00.000000
"""

from __future__ import annotations

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1018"
down_revision: Union[str, Sequence[str], None] = "1017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "writing_readiness",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("review_status", sa.String(length=20), nullable=True),
        sa.Column("review_issues", sa.JSON(), nullable=False),
        sa.Column("review_summary", sa.Text(), nullable=False),
        sa.Column("review_snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("approved_snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id"),
    )
    op.create_index(
        op.f("ix_writing_readiness_project_id"),
        "writing_readiness",
        ["project_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_writing_readiness_review_status"),
        "writing_readiness",
        ["review_status"],
        unique=False,
    )
    _add_tool_categories()


def _add_tool_categories() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id, key, enabled_tool_categories FROM agent_definitions")
    ).fetchall()
    for row in rows:
        raw = row.enabled_tool_categories
        if isinstance(raw, str):
            try:
                categories = json.loads(raw)
            except json.JSONDecodeError:
                continue
        else:
            categories = raw
        if not isinstance(categories, list):
            continue
        additions = ["writing_readiness_read"]
        if row.key == "auditor":
            additions.append("writing_readiness_review")
        normalized = list(dict.fromkeys([*categories, *additions]))
        statement = sa.text(
            "UPDATE agent_definitions SET enabled_tool_categories = :categories WHERE id = :id"
        ).bindparams(sa.bindparam("categories", type_=sa.JSON()))
        bind.execute(statement, {"id": row.id, "categories": normalized})


def downgrade() -> None:
    op.drop_index(
        op.f("ix_writing_readiness_review_status"),
        table_name="writing_readiness",
    )
    op.drop_index(
        op.f("ix_writing_readiness_project_id"),
        table_name="writing_readiness",
    )
    op.drop_table("writing_readiness")
