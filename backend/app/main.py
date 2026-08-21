"""FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_query import router as query_router
from app.services.schema_service import refresh_schema_cache

import os

# Configure logging
log_level = os.getenv("LOG_LEVEL", "DEBUG" if os.getenv("DEBUG", "true").lower() in ("1", "true", "yes") else "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.DEBUG),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    # Startup
    logger.info("QueryLens backend starting up...")
    try:
        await refresh_schema_cache()
        logger.info("Schema cache initialized successfully")
    except Exception as exc:
        logger.error("Failed to initialize schema cache: %s", exc)
        logger.warning("Schema cache will be empty until database is available")

    yield

    # Shutdown
    logger.info("QueryLens backend shutting down...")


app = FastAPI(
    title="QueryLens",
    description="Ambiguity-aware natural language to SQL API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(query_router)


@app.get("/")
async def root():
    """Root endpoint — redirects to docs."""
    return {"message": "QueryLens API", "docs": "/docs"}
