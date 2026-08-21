"""Schema introspection service — reads Postgres metadata and caches it."""

import logging
from typing import Any

from sqlalchemy import text

from app.db.session import get_db_session
from app.schemas.responses import ColumnInfo, TableInfo

logger = logging.getLogger(__name__)

# In-memory cache
_schema_cache: list[TableInfo] = []

# Human-readable column descriptions for the query_lens dataset
# These dramatically improve LLM SQL accuracy
COLUMN_DESCRIPTIONS: dict[str, dict[str, str]] = {
    "query_lens": {
        "invoice_no": (
            "Invoice/transaction identifier. Multiple rows share the same invoice_no "
            "when a single order contains multiple line items. A prefix of 'C' indicates "
            "a cancelled/credit transaction."
        ),
        "stock_code": "Product/SKU identifier.",
        "description": "Product name/description.",
        "quantity": (
            "Units purchased. Can be negative for returns/cancellations."
        ),
        "invoice_date": "Date and time of the transaction.",
        "unit_price": "Price per unit in GBP (British Pounds).",
        "customer_id": (
            "Customer identifier. Nullable — some transactions have no associated "
            "customer (e.g. guest/anonymous orders)."
        ),
        "country": "Customer's country.",
    }
}

# Derived metric hints added to the schema summary
METRIC_HINTS = """
Derived/common metrics:
- total_sales or line_total = quantity * unit_price, computed at query time.
- To exclude cancelled orders, filter with: invoice_no NOT LIKE 'C%'
- To exclude returns, filter with: quantity > 0
- customer_id can be NULL (guest orders); decide whether to include or exclude them.
- invoice_date is a full TIMESTAMP; clarify granularity (day/month/year) for date groupings.
"""


async def refresh_schema_cache() -> list[TableInfo]:
    """Introspect the Postgres database and cache table/column metadata."""
    global _schema_cache

    logger.info("Refreshing schema cache from database...")

    tables: list[TableInfo] = []

    async with get_db_session() as session:
        # Get all user tables
        result = await session.execute(
            text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
        )
        table_names = [row[0] for row in result.fetchall()]

        for table_name in table_names:
            # Get columns for this table
            col_result = await session.execute(
                text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = :table_name
                    ORDER BY ordinal_position
                """),
                {"table_name": table_name},
            )

            columns: list[ColumnInfo] = []
            for col_row in col_result.fetchall():
                col_name, data_type, is_nullable = col_row
                desc = COLUMN_DESCRIPTIONS.get(table_name, {}).get(col_name)
                columns.append(
                    ColumnInfo(
                        name=col_name,
                        data_type=data_type,
                        is_nullable=(is_nullable == "YES"),
                        description=desc,
                    )
                )

            tables.append(TableInfo(table_name=table_name, columns=columns))

    _schema_cache = tables
    logger.info("Schema cache refreshed: %d tables found", len(tables))
    return tables


def get_cached_schema() -> list[TableInfo]:
    """Return the cached schema metadata."""
    return _schema_cache


def build_schema_summary() -> str:
    """Build a condensed schema summary string for LLM prompt injection.

    Returns a human-readable string describing all tables and their columns,
    suitable for including in an LLM prompt.
    """
    if not _schema_cache:
        return "No schema information available."

    parts: list[str] = []

    for table in _schema_cache:
        col_lines: list[str] = []
        for col in table.columns:
            nullable = "NULLABLE" if col.is_nullable else "NOT NULL"
            desc = f" -- {col.description}" if col.description else ""
            col_lines.append(f"    {col.name} ({col.data_type}, {nullable}){desc}")

        parts.append(f"Table: {table.table_name}\n" + "\n".join(col_lines))

    schema_text = "\n\n".join(parts)
    return f"{schema_text}\n\n{METRIC_HINTS}"
