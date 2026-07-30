"""Persistence helpers for project writing readiness."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.storage.models.writing_readiness import WritingReadiness


async def get_by_project(
    session: AsyncSession,
    project_id: str,
) -> WritingReadiness | None:
    result = await session.execute(
        select(WritingReadiness).where(
            col(WritingReadiness.project_id) == project_id
        )
    )
    return result.scalar_one_or_none()


async def create(
    session: AsyncSession,
    readiness: WritingReadiness,
) -> WritingReadiness:
    session.add(readiness)
    await session.flush()
    await session.refresh(readiness)
    return readiness


async def update(
    session: AsyncSession,
    readiness: WritingReadiness,
) -> WritingReadiness:
    session.add(readiness)
    await session.flush()
    await session.refresh(readiness)
    return readiness


async def delete_by_project(session: AsyncSession, project_id: str) -> None:
    row = await get_by_project(session, project_id)
    if row is not None:
        await session.delete(row)
        await session.flush()
