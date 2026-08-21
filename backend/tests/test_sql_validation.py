"""Tests for SQL validation service."""

import pytest
from app.services.sql_validation_service import validate_sql_syntax, SQLValidationError


def test_valid_select_with_limit():
    sql = "SELECT invoice_no, quantity * unit_price AS total FROM query_lens LIMIT 50;"
    result = validate_sql_syntax(sql)
    assert "LIMIT 50" in result
    assert result.startswith("SELECT")


def test_valid_select_injects_limit():
    sql = "SELECT invoice_no, quantity FROM query_lens"
    result = validate_sql_syntax(sql)
    assert "LIMIT" in result
    assert result.startswith("SELECT")


def test_valid_with_cte():
    sql = "WITH summary AS (SELECT country, SUM(quantity) AS total_qty FROM query_lens GROUP BY country) SELECT * FROM summary LIMIT 10"
    result = validate_sql_syntax(sql)
    assert result.startswith("WITH")
    assert "LIMIT 10" in result


def test_reject_empty_sql():
    with pytest.raises(SQLValidationError, match="Empty SQL statement"):
        validate_sql_syntax("")
    with pytest.raises(SQLValidationError, match="Empty SQL statement"):
        validate_sql_syntax("   ")


def test_reject_multiple_statements():
    sql = "SELECT * FROM query_lens; SELECT * FROM other_table;"
    with pytest.raises(SQLValidationError, match="Multiple SQL statements"):
        validate_sql_syntax(sql)


@pytest.mark.parametrize("blocked_keyword", [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT", "REVOKE", "CREATE"
])
def test_reject_blocked_keywords(blocked_keyword):
    sql = f"SELECT * FROM query_lens; {blocked_keyword} TABLE query_lens;"
    with pytest.raises(SQLValidationError):
        validate_sql_syntax(sql)


def test_reject_dml_statement():
    sql = "UPDATE query_lens SET quantity = 100 WHERE invoice_no = '536365'"
    with pytest.raises(SQLValidationError, match="Only SELECT statements"):
        validate_sql_syntax(sql)


def test_reject_delete_statement():
    sql = "DELETE FROM query_lens WHERE customer_id = 12345"
    with pytest.raises(SQLValidationError, match="Only SELECT statements"):
        validate_sql_syntax(sql)
