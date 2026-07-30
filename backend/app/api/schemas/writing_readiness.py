"""API schemas for the project writing-readiness gate."""

from typing import Literal

from pydantic import BaseModel, Field


class WritingReadinessRequirementResponse(BaseModel):
    id: str
    label: str
    ready: bool
    detail: str


class WritingReadinessReviewResponse(BaseModel):
    status: Literal["pass", "fail"] | None = None
    summary: str = ""
    issues: list[str] = Field(default_factory=list)
    snapshot_hash: str | None = None
    is_stale: bool = False


class WritingReadinessArtifactSummaryResponse(BaseModel):
    world_entries: int
    characters: int
    notes: int
    chapters: int


class WritingReadinessResponse(BaseModel):
    project_id: str
    stage: Literal[
        "worldbuilding",
        "macro_outline",
        "opening_outline",
        "review",
        "ready",
        "writing",
    ]
    ready_to_start: bool
    is_stale: bool
    requirements: list[WritingReadinessRequirementResponse]
    review: WritingReadinessReviewResponse
    blockers: list[str]
    artifact_summary: WritingReadinessArtifactSummaryResponse


class WritingReadinessConflictResponse(BaseModel):
    code: Literal["writing_readiness_required"] = "writing_readiness_required"
    message: str
    blockers: list[str]
