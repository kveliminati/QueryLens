"""Chart suggestion service — rule-based chart type selection from result shape."""

import logging
from datetime import date, datetime
from decimal import Decimal

logger = logging.getLogger(__name__)


def suggest_chart(
    columns: list[str],
    rows: list[list],
    query_text: str = "",
) -> dict:
    """Suggest an appropriate chart type based on the result set shape.

    Rules (from spec §8):
    - 1 row, 1 numeric column → number_card
    - 1 categorical + 1 numeric, low cardinality (≤15) → bar
    - 1 time/date + 1 numeric → line
    - 1 categorical + 1 numeric, share-of-total context → pie
    - 2+ numeric columns across a shared dimension → grouped_bar / multi_line
    - High cardinality categorical (>15) → table

    Args:
        columns: List of column names.
        rows: List of result rows.
        query_text: The original query text (used for context hints like "share of").

    Returns:
        Dict with: chart_suggestion (str), x_column (str|None), y_columns (list[str]|None).
    """
    if not rows or not columns:
        return {"chart_suggestion": "table", "x_column": None, "y_columns": None}

    num_cols = len(columns)
    num_rows = len(rows)

    # Classify columns as numeric, temporal, or categorical
    col_types = _classify_columns(columns, rows)

    numeric_cols = [c for c, t in col_types.items() if t == "numeric"]
    temporal_cols = [c for c, t in col_types.items() if t == "temporal"]
    categorical_cols = [c for c, t in col_types.items() if t == "categorical"]

    logger.info(
        "Chart suggestion: %d cols (%d numeric, %d temporal, %d categorical), %d rows",
        num_cols, len(numeric_cols), len(temporal_cols), len(categorical_cols), num_rows,
    )

    # Rule 1: Single value → number card
    if num_rows == 1 and len(numeric_cols) == 1 and num_cols == 1:
        return {
            "chart_suggestion": "number_card",
            "x_column": None,
            "y_columns": [numeric_cols[0]],
        }

    # Rule 2: 1 temporal + 1 numeric → line chart
    if len(temporal_cols) == 1 and len(numeric_cols) == 1:
        return {
            "chart_suggestion": "line",
            "x_column": temporal_cols[0],
            "y_columns": [numeric_cols[0]],
        }

    # Rule 3: 1 temporal + 2+ numeric → multi-line
    if len(temporal_cols) == 1 and len(numeric_cols) >= 2:
        return {
            "chart_suggestion": "multi_line",
            "x_column": temporal_cols[0],
            "y_columns": numeric_cols,
        }

    # Rule 4: 1 categorical + 1 numeric
    if len(categorical_cols) == 1 and len(numeric_cols) == 1:
        cardinality = num_rows

        # Check for pie chart context (share of, percentage, proportion)
        share_keywords = ["share", "percent", "proportion", "distribution", "breakdown"]
        is_share_context = any(kw in query_text.lower() for kw in share_keywords)

        if is_share_context and cardinality <= 10:
            return {
                "chart_suggestion": "pie",
                "x_column": categorical_cols[0],
                "y_columns": [numeric_cols[0]],
            }

        if cardinality <= 15:
            return {
                "chart_suggestion": "bar",
                "x_column": categorical_cols[0],
                "y_columns": [numeric_cols[0]],
            }

        # High cardinality → table only
        return {
            "chart_suggestion": "table",
            "x_column": categorical_cols[0],
            "y_columns": [numeric_cols[0]],
        }

    # Rule 5: 1 categorical + 2+ numeric → grouped bar
    if len(categorical_cols) == 1 and len(numeric_cols) >= 2 and num_rows <= 15:
        return {
            "chart_suggestion": "grouped_bar",
            "x_column": categorical_cols[0],
            "y_columns": numeric_cols,
        }

    # Rule 6: Single row with multiple numeric columns → number card (multiple values)
    if num_rows == 1 and len(numeric_cols) >= 1:
        return {
            "chart_suggestion": "number_card",
            "x_column": None,
            "y_columns": numeric_cols,
        }

    # Default: table
    return {"chart_suggestion": "table", "x_column": None, "y_columns": None}


def _classify_columns(columns: list[str], rows: list[list]) -> dict[str, str]:
    """Classify each column as 'numeric', 'temporal', or 'categorical'.

    Uses the actual data values and column name heuristics.
    """
    col_types: dict[str, str] = {}

    for i, col_name in enumerate(columns):
        values = [row[i] for row in rows if row[i] is not None]

        if not values:
            col_types[col_name] = "categorical"
            continue

        # Check temporal first (by type or name heuristic)
        if any(isinstance(v, (date, datetime)) for v in values):
            col_types[col_name] = "temporal"
            continue

        # Name-based temporal heuristic
        temporal_keywords = ["date", "year", "month", "day", "week", "quarter", "time"]
        if any(kw in col_name.lower() for kw in temporal_keywords):
            # Check if values look numeric (year values like 2010, 2011)
            if all(isinstance(v, (int, float, Decimal)) for v in values):
                # Year values are technically numeric but represent time
                sample = values[:5]
                if all(1900 <= float(v) <= 2100 for v in sample):
                    col_types[col_name] = "temporal"
                    continue

            col_types[col_name] = "temporal"
            continue

        # Check numeric
        if all(isinstance(v, (int, float, Decimal)) for v in values):
            col_types[col_name] = "numeric"
            continue

        # Default: categorical
        col_types[col_name] = "categorical"

    return col_types
