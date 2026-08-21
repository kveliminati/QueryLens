"""Async SQLAlchemy engine and session management for read-only queries."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create the async engine with the read-only user
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional scope around a series of read-only operations.

    Sets a statement timeout to prevent runaway queries.
    """
    async with async_session_factory() as session:
        try:
            # Set statement timeout for this session
            timeout_ms = settings.query_timeout_seconds * 1000
            await session.execute(
                text(f"SET statement_timeout = {timeout_ms}")
            )
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection() -> bool:
    """Verify the database is reachable."""
    try:
        async with get_db_session() as session:
            result = await session.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as exc:
        logger.error("Database connection check failed: %s", exc)
        return False
