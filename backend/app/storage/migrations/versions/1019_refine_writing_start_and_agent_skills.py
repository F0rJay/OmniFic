"""refine first-writing authorization and default agent skills

Revision ID: 1019
Revises: 1018
Create Date: 2026-07-30 15:00:00.000000
"""

from __future__ import annotations

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1019"
down_revision: Union[str, Sequence[str], None] = "1018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_AGENT_SKILLS: dict[str, list[str]] = {
    "build": ["builtin-skill--worldbook-design"],
    "plan": ["builtin-skill--story-state-tracking"],
    "explore": [
        "builtin-skill--story-state-tracking",
        "builtin-skill--story-deconstruction",
    ],
    "composer": [
        "builtin-skill--character-design",
        "builtin-skill--character-relationship",
        "builtin-skill--emotional-arc",
        "builtin-skill--opening-design",
        "builtin-skill--story-hooks",
        "builtin-skill--reversal-design",
        "builtin-skill--villain-reveal",
        "builtin-skill--dialogue-design",
    ],
    "auditor": [
        "builtin-skill--story-quality",
        "builtin-skill--reader-contract",
        "builtin-skill--story-state-tracking",
    ],
    "writer": [
        "builtin-skill--prose-format",
        "builtin-skill--deslop-writing",
        "builtin-skill--dialogue-design",
        "builtin-skill--emotional-arc",
        "builtin-skill--character-relationship",
        "builtin-skill--opening-design",
        "builtin-skill--story-hooks",
        "builtin-skill--story-state-tracking",
    ],
    "reviewer": [
        "builtin-skill--story-quality",
        "builtin-skill--deslop-lexicon",
        "builtin-skill--reader-contract",
        "builtin-skill--prose-format",
        "builtin-skill--story-state-tracking",
    ],
    "actor": [
        "builtin-skill--deslop-writing",
        "builtin-skill--prose-format",
        "builtin-skill--story-state-tracking",
    ],
}


def _load_list(raw: object) -> list[str] | None:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return None
    if not isinstance(raw, list):
        return None
    return [item for item in raw if isinstance(item, str) and item]


def _merge_agent_defaults() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT id, key, enabled_skills, enabled_tool_categories "
            "FROM agent_definitions"
        )
    ).fetchall()
    update_skills = sa.text(
        "UPDATE agent_definitions SET enabled_skills = :value WHERE id = :id"
    ).bindparams(sa.bindparam("value", type_=sa.JSON()))
    update_categories = sa.text(
        "UPDATE agent_definitions SET enabled_tool_categories = :value WHERE id = :id"
    ).bindparams(sa.bindparam("value", type_=sa.JSON()))

    for row in rows:
        additions = DEFAULT_AGENT_SKILLS.get(row.key)
        skills = _load_list(row.enabled_skills)
        if additions is not None and skills is not None:
            bind.execute(
                update_skills,
                {"id": row.id, "value": list(dict.fromkeys([*skills, *additions]))},
            )

        categories = _load_list(row.enabled_tool_categories)
        if row.key in {"build", "plan"} and categories is not None:
            bind.execute(
                update_categories,
                {
                    "id": row.id,
                    "value": list(dict.fromkeys([*categories, "writing_start"])),
                },
            )


def upgrade() -> None:
    with op.batch_alter_table("writing_readiness") as batch_op:
        batch_op.alter_column(
            "approved_snapshot_hash",
            new_column_name="authorized_snapshot_hash",
            existing_type=sa.String(length=64),
        )
        batch_op.alter_column(
            "approved_at",
            new_column_name="authorized_at",
            existing_type=sa.DateTime(),
        )
        batch_op.add_column(
            sa.Column("authorized_revision_id", sa.String(length=64), nullable=True)
        )
    op.execute(
        sa.text(
            "UPDATE writing_readiness SET authorized_revision_id = NULL, "
            "authorized_snapshot_hash = NULL, authorized_at = NULL"
        )
    )
    _merge_agent_defaults()


def downgrade() -> None:
    with op.batch_alter_table("writing_readiness") as batch_op:
        batch_op.drop_column("authorized_revision_id")
        batch_op.alter_column(
            "authorized_snapshot_hash",
            new_column_name="approved_snapshot_hash",
            existing_type=sa.String(length=64),
        )
        batch_op.alter_column(
            "authorized_at",
            new_column_name="approved_at",
            existing_type=sa.DateTime(),
        )
