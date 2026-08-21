"""API routes for the query pipeline: /query, /clarify, /schema, /health."""

import logging
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.db.session import get_db_session, check_db_connection
from app.schemas.requests import QueryRequest, ClarifyRequest
from app.schemas.responses import QueryResponse, SchemaResponse, HealthResponse
from app.services.ambiguity_service import detect_ambiguity
from app.services.sql_generation_service import generate_sql
from app.services.sql_validation_service import validate_sql, SQLValidationError
from app.services.chart_suggestion_service import suggest_chart
from app.services.schema_service import get_cached_schema

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["query"])

# In-memory session store for tracking ambiguous query flows
# Maps session_id → {original_query, ambiguity_result}
_sessions: dict[str, dict] = {}


def _serialize_value(val: Any) -> Any:
    """Convert database values to JSON-serializable types."""
    if val is None:
        return None
    if isinstance(val, Decimal):
        # Preserve precision for display, convert to float
        return float(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return val


async def _execute_query_pipeline(
    resolved_query: str,
    session_id: str | None = None,
) -> QueryResponse:
    """Execute the full pipeline: generate SQL → validate → execute → suggest chart.

    Args:
        resolved_query: The resolved/clarified natural language intent.
        session_id: Optional session ID for tracking.

    Returns:
        QueryResponse with results.
    """
    # Step 1: Generate SQL
    try:
        gen_result = await generate_sql(resolved_query)
        raw_sql = gen_result.get("sql", "")
        explanation = gen_result.get("explanation", "")
    except Exception as exc:
        logger.error("SQL generation failed: %s", exc)
        return QueryResponse(
            status="error",
            error_message=f"Failed to generate SQL: {exc}",
            session_id=session_id,
        )

    # Step 2: Validate SQL
    try:
        validated_sql = await validate_sql(raw_sql)
    except SQLValidationError as exc:
        logger.error("SQL validation failed: %s", exc)
        return QueryResponse(
            status="error",
            error_message=f"Generated SQL failed validation: {exc}",
            sql=raw_sql,
            session_id=session_id,
        )

    # Step 3: Execute SQL
    try:
        async with get_db_session() as session:
            result = await session.execute(text(validated_sql))
            columns = list(result.keys())
            raw_rows = result.fetchall()
            rows = [
                [_serialize_value(val) for val in row]
                for row in raw_rows
            ]
    except Exception as exc:
        logger.error("SQL execution failed: %s", exc)
        return QueryResponse(
            status="error",
            error_message=f"Query execution failed: {exc}",
            sql=validated_sql,
            session_id=session_id,
        )

    # Step 4: Suggest chart type
    chart_info = suggest_chart(columns, rows, resolved_query)

    logger.info(
        "Query pipeline complete: %d columns, %d rows, chart=%s",
        len(columns), len(rows), chart_info["chart_suggestion"],
    )

    return QueryResponse(
        status="ok",
        columns=columns,
        rows=rows,
        sql=validated_sql,
        explanation=explanation,
        chart_suggestion=chart_info["chart_suggestion"],
        x_column=chart_info.get("x_column"),
        y_columns=chart_info.get("y_columns"),
        session_id=session_id,
    )


@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest) -> QueryResponse:
    """Accept a natural language query, detect ambiguity, and return results or a clarification prompt.

    Flow:
    1. Run ambiguity detection on the raw query
    2. If ambiguous → return clarification prompt with options
    3. If clear → run full pipeline (generate → validate → execute → chart)
    """
    session_id = str(uuid.uuid4())

    logger.info("New query [%s]: %s", session_id, request.query)

    # Step 1: Detect ambiguity
    try:
        ambiguity_result = await detect_ambiguity(request.query)
    except Exception as exc:
        logger.error("Ambiguity detection failed: %s", exc)
        # Fall through to SQL generation if ambiguity detection fails
        ambiguity_result = {"ambiguous": False}

    # Step 2: Handle ambiguous case
    if ambiguity_result.get("ambiguous", False):
        # Store session for later clarification
        _sessions[session_id] = {
            "original_query": request.query,
            "ambiguity_result": ambiguity_result,
        }

        return QueryResponse(
            status="clarification_needed",
            clarifying_question=ambiguity_result.get("clarifying_question", ""),
            options=ambiguity_result.get("options", []),
            session_id=session_id,
        )

    # Step 3: Clear query → execute pipeline
    return await _execute_query_pipeline(request.query, session_id)


@router.post("/clarify", response_model=QueryResponse)
async def clarify(request: ClarifyRequest) -> QueryResponse:
    """Accept a clarification choice and execute the resolved query.

    Combines the original query with the user's clarification into a
    resolved natural language intent, then runs the full pipeline.
    """
    logger.info(
        "Clarification [%s]: original=%s, choice=%s",
        request.session_id, request.original_query, request.clarification,
    )

    # Build a resolved query that combines the original + clarification
    resolved_query = f"{request.original_query} — {request.clarification}"

    # Clean up session
    _sessions.pop(request.session_id, None)

    return await _execute_query_pipeline(resolved_query, request.session_id)


@router.get("/schema", response_model=SchemaResponse)
async def schema() -> SchemaResponse:
    """Return cached schema metadata (tables, columns, types)."""
    tables = get_cached_schema()
    return SchemaResponse(tables=tables)


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Basic liveness/readiness check."""
    db_ok = await check_db_connection()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        database="connected" if db_ok else "unreachable",
    )
