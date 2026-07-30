"""Project-level gate for Agent-authored chapter content."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, JSON, Text
from sqlmodel import Field, SQLModel

from app.core.ids import generate_id


class WritingReadiness(SQLModel, table=True):
    __tablename__ = "writing_readiness"

    id: str = Field(default_factory=generate_id, primary_key=True)
    project_id: str = Field(
        index=True,
        unique=True,
        foreign_key="projects.id",
        max_length=64,
    )
    review_status: str | None = Field(default=None, index=True, max_length=20)
    review_issues: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
    )
    review_summary: str = Field(
        default="",
        sa_column=Column(Text, nullable=False, default=""),
    )
    review_snapshot_hash: str | None = Field(default=None, max_length=64)
    authorized_revision_id: str | None = Field(default=None, max_length=64)
    authorized_snapshot_hash: str | None = Field(default=None, max_length=64)
    authorized_at: datetime | None = Field(default=None)
    metadata_json: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, default=dict),
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
