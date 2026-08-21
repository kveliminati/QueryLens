"""SQL generation service — uses an LLM call to convert natural language to SQL."""

import logging

from app.core.llm_client import ask_json
from app.services.schema_service import build_schema_summary
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a SQL generation engine for a PostgreSQL database.
Your job is to convert a natural language business question into a valid PostgreSQL SELECT query.

Rules:
1. Generate ONLY SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or any DDL/DML.
2. Always use explicit column aliases with AS.
3. Always include a LIMIT clause (default LIMIT {row_limit} unless the question implies a specific limit).
4. Use PostgreSQL syntax and functions (e.g. EXTRACT, DATE_TRUNC, etc.).
5. For monetary calculations, use quantity * unit_price as the line total / revenue.
6. To exclude cancelled orders, use: invoice_no NOT LIKE 'C%%'
7. To exclude returns, use: quantity > 0
8. Use appropriate GROUP BY, ORDER BY, and WHERE clauses.
9. Format dates and timestamps appropriately for the requested granularity.
10. When asked for "top N", default to top 10 if not specified.

You must respond with ONLY valid JSON (no markdown fences, no prose). Use this exact schema:
{{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what this query does and any assumptions made"
}}

Examples:

Question: "total sales by year"
Response: {{"sql": "SELECT EXTRACT(YEAR FROM invoice_date) AS year, SUM(quantity * unit_price) AS total_sales FROM query_lens WHERE invoice_no NOT LIKE 'C%' AND quantity > 0 GROUP BY 1 ORDER BY 1 LIMIT {row_limit}", "explanation": "Calculates total revenue (quantity × unit_price) grouped by year, excluding cancelled orders and returns."}}

Question: "how many unique customers do we have?"
Response: {{"sql": "SELECT COUNT(DISTINCT customer_id) AS unique_customers FROM query_lens WHERE customer_id IS NOT NULL LIMIT {row_limit}", "explanation": "Counts distinct customer IDs, excluding NULL (guest) customers."}}
"""


async def generate_sql(resolved_query: str) -> dict:
    """Generate a PostgreSQL SELECT query from a natural language question.

    Args:
        resolved_query: The clarified/resolved natural language intent.

    Returns:
        Dict with keys: sql (str), explanation (str).
    """
    schema_summary = build_schema_summary()
    row_limit = settings.query_row_limit

    system = SYSTEM_PROMPT.format(row_limit=row_limit)

    user_prompt = f"""Question: {resolved_query}

Database schema:
{schema_summary}

Generate a PostgreSQL SELECT query for this question. Respond with JSON only."""

    logger.info("Generating SQL for query: %s", resolved_query)

    result = await ask_json(
        system_prompt=system,
        user_prompt=user_prompt,
        temperature=0.1,
    )

    logger.info("Generated SQL: %s", result.get("sql", ""))
    return result
