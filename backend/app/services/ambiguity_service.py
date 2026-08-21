"""Ambiguity detection service — uses an LLM call to detect vague queries."""

import logging

from app.core.llm_client import ask_json
from app.services.schema_service import build_schema_summary

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an ambiguity detector for a natural language to SQL system.
Your job is to determine whether a user's business question is clear enough to generate
an accurate SQL query, or whether it is ambiguous and needs clarification.

You will receive:
1. The user's natural language question
2. A database schema summary

Signals that indicate ambiguity:
- Missing time range / period (e.g. "total sales" — since when?)
- Missing grouping dimension when a breakdown is likely useful
- Vague metric definitions (e.g. "performance", "sales" without specifying gross/net/refunded)
- Missing filters that materially change the result (region, product line, etc.)
- Pronouns or references with no prior context ("that", "those")
- "Top" or "best" without specifying the ranking metric or count

Signals that indicate clarity:
- The query specifies what metric, what dimension, and any necessary filters
- Simple aggregation questions with an obvious interpretation (e.g. "how many rows are in the table?")
- Explicit time ranges, groupings, or filters

You must respond with ONLY valid JSON (no markdown fences, no prose). Use this exact schema:
{
  "ambiguous": true/false,
  "clarifying_question": "string (only if ambiguous)",
  "options": ["option1", "option2", ...] (only if ambiguous, 2-5 options),
  "reasoning": "string (internal reasoning, not shown to user)"
}

Examples:

User: "get me total sales"
Schema: (table with invoice_no, quantity, unit_price, invoice_date, country, customer_id)
Response: {"ambiguous": true, "clarifying_question": "How would you like to see total sales?", "options": ["Total overall", "By year", "By month", "By country", "By product"], "reasoning": "The query doesn't specify a time range or grouping dimension. Total sales could be shown as a single number or broken down by various dimensions."}

User: "how many unique customers do we have?"
Schema: (same)
Response: {"ambiguous": false, "clarifying_question": null, "options": null, "reasoning": "The query is clear — count distinct customer_id. No grouping or time range needed for a simple count."}

User: "show me top products"
Schema: (same)
Response: {"ambiguous": true, "clarifying_question": "How would you like to rank products?", "options": ["By total revenue (quantity × unit_price)", "By total quantity sold", "Top 10 by revenue", "Top 10 by quantity"], "reasoning": "Top products is ambiguous — unclear whether to rank by revenue or quantity, and no limit specified."}
"""


async def detect_ambiguity(query: str) -> dict:
    """Detect whether a natural language query is ambiguous.

    Args:
        query: The user's raw natural language question.

    Returns:
        Dict with keys: ambiguous (bool), clarifying_question (str|None),
        options (list|None), reasoning (str).
    """
    schema_summary = build_schema_summary()

    user_prompt = f"""User question: {query}

Database schema:
{schema_summary}

Analyze this question and determine if it is ambiguous. Respond with JSON only."""

    logger.info("Detecting ambiguity for query: %s", query)

    result = await ask_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.1,
    )

    logger.info(
        "Ambiguity result: ambiguous=%s, reasoning=%s",
        result.get("ambiguous"),
        result.get("reasoning", ""),
    )

    return result
