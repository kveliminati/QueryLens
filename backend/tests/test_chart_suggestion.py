"""Tests for chart suggestion service."""

from datetime import date, datetime
from decimal import Decimal
from app.services.chart_suggestion_service import suggest_chart


def test_empty_rows_or_columns():
    res = suggest_chart([], [])
    assert res["chart_suggestion"] == "table"

    res = suggest_chart(["sales"], [])
    assert res["chart_suggestion"] == "table"


def test_number_card_single_value():
    columns = ["total_sales"]
    rows = [[Decimal("9747747.93")]]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "number_card"
    assert res["y_columns"] == ["total_sales"]


def test_number_card_single_row_multi_numeric():
    columns = ["total_sales", "total_orders", "total_items"]
    rows = [[10000.50, 250, 1500]]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "number_card"
    assert len(res["y_columns"]) == 3


def test_line_chart_temporal_and_numeric():
    columns = ["invoice_date", "total_sales"]
    rows = [
        [datetime(2011, 1, 1), 100.0],
        [datetime(2011, 2, 1), 200.0],
        [datetime(2011, 3, 1), 150.0],
    ]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "line"
    assert res["x_column"] == "invoice_date"
    assert res["y_columns"] == ["total_sales"]


def test_line_chart_year_heuristic():
    columns = ["year", "revenue"]
    rows = [
        [2010, 50000],
        [2011, 120000],
    ]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "line"
    assert res["x_column"] == "year"
    assert res["y_columns"] == ["revenue"]


def test_multi_line_chart():
    columns = ["invoice_date", "sales", "returns"]
    rows = [
        [datetime(2011, 1, 1), 100.0, 10.0],
        [datetime(2011, 2, 1), 200.0, 15.0],
    ]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "multi_line"
    assert res["x_column"] == "invoice_date"
    assert res["y_columns"] == ["sales", "returns"]


def test_bar_chart_low_cardinality():
    columns = ["country", "total_sales"]
    rows = [
        ["United Kingdom", 5000.0],
        ["Germany", 1200.0],
        ["France", 800.0],
    ]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "bar"
    assert res["x_column"] == "country"
    assert res["y_columns"] == ["total_sales"]


def test_pie_chart_share_context():
    columns = ["category", "sales"]
    rows = [
        ["Electronics", 4000.0],
        ["Clothing", 3000.0],
        ["Home", 1000.0],
    ]
    res = suggest_chart(columns, rows, query_text="Show me share of sales by category")
    assert res["chart_suggestion"] == "pie"
    assert res["x_column"] == "category"
    assert res["y_columns"] == ["sales"]


def test_high_cardinality_table_fallback():
    columns = ["stock_code", "quantity"]
    # 20 rows (> 15)
    rows = [[f"SKU_{i}", i * 10] for i in range(20)]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "table"


def test_grouped_bar_chart():
    columns = ["country", "gross_sales", "net_sales"]
    rows = [
        ["United Kingdom", 5000.0, 4500.0],
        ["Germany", 1200.0, 1100.0],
        ["France", 800.0, 750.0],
    ]
    res = suggest_chart(columns, rows)
    assert res["chart_suggestion"] == "grouped_bar"
    assert res["x_column"] == "country"
    assert res["y_columns"] == ["gross_sales", "net_sales"]
