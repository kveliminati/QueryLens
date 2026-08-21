"""SQL validation service — enforces read-only, single-statement, LIMIT rules."""

import logging
import re

from sqlalchemy import text

from app.db.session import get_db_session
from app.core.config import settings

logger = logging.getLogger(__name__)

# Dangerous SQL keywords that should never appear at statement level
BLOCKED_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
    "GRANT", "REVOKE", "CREATE", "EXEC", "EXECUTE", "CALL",
]


class SQLValidationError(Exception):
    """Raised when generated SQL fails validation."""
    pass


def validate_sql_syntax(sql: str) -> str:
    """Validate and sanitize the generated SQL.

    Checks:
    1. Single statement (no multiple statements separated by ;)
    2. SELECT-only (blocks DML/DDL keywords at statement level)
    3. Injects LIMIT if missing

    Args:
        sql: The generated SQL string.

    Returns:
        The validated (and possibly modified) SQL string.

    Raises:
        SQLValidationError: If the SQL fails validation.
    """
    if not sql or not sql.strip():
        raise SQLValidationError("Empty SQL statement")

    sql = sql.strip().rstrip(";")

    # Check for multiple statements
    # Split on semicolons that aren't inside quotes
    # Simple approach: reject if there's a semicolon in the middle
    if ";" in sql:
        raise SQLValidationError(
            "Multiple SQL statements detected. Only single SELECT statements are allowed."
        )

    # Check it starts with SELECT (or WITH for CTEs)
    upper_sql = sql.upper().lstrip()
    if not (upper_sql.startswith("SELECT") or upper_sql.startswith("WITH")):
        raise SQLValidationError(
            "Only SELECT statements (or WITH/CTE) are allowed."
        )

    # Check for blocked keywords at the statement level
    # We look for these as standalone words (not inside column names or strings)
    for keyword in BLOCKED_KEYWORDS:
        # Match the keyword as a standalone word at a position that suggests
        # it's a statement keyword (not inside a string literal or identifier)
        pattern = rf"(?<!['\w])\b{keyword}\b(?!['\w])"
        if re.search(pattern, sql, re.IGNORECASE):
            raise SQLValidationError(
                f"Blocked SQL keyword detected: {keyword}. "
                "Only SELECT statements are allowed."
            )

    # Inject LIMIT if missing
    if "LIMIT" not in sql.upper():
        sql = f"{sql} LIMIT {settings.query_row_limit}"
        logger.info("Injected LIMIT %d into query", settings.query_row_limit)

    return sql


async def validate_with_explain(sql: str) -> None:
    """Run EXPLAIN on the query to verify it's syntactically and semantically valid.

    This catches issues like:
    - Referencing non-existent tables or columns
    - Type mismatches
    - Invalid function usage

    Args:
        sql: The SQL to validate via EXPLAIN.

    Raises:
        SQLValidationError: If EXPLAIN fails.
    """
    explain_sql = f"EXPLAIN {sql}"

    try:
        async with get_db_session() as session:
            await session.execute(text(explain_sql))
            logger.info("EXPLAIN validation passed")
    except Exception as exc:
        logger.error("EXPLAIN validation failed: %s", exc)
        raise SQLValidationError(
            f"SQL validation failed (EXPLAIN check): {exc}"
        ) from exc


async def validate_sql(sql: str) -> str:
    """Full validation pipeline: syntax checks + EXPLAIN.

    Args:
        sql: The generated SQL string.

    Returns:
        The validated SQL string (possibly with LIMIT injected).

    Raises:
        SQLValidationError: If any validation step fails.
    """
    # Step 1: Syntax-level checks
    validated_sql = validate_sql_syntax(sql)

    # Step 2: EXPLAIN check against the actual database
    await validate_with_explain(validated_sql)

    return validated_sql
