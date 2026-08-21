"""Integration and scenario tests for QueryLens API endpoints."""

import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.anyio
async def test_health_endpoint():
    with patch("app.api.routes_query.check_db_connection", new_callable=AsyncMock) as mock_db:
        mock_db.return_value = True
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/health")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert data["database"] == "connected"


@pytest.mark.anyio
async def test_schema_endpoint():
    with patch("app.api.routes_query.get_cached_schema") as mock_schema:
        mock_schema.return_value = [
            {
                "table_name": "query_lens",
                "columns": [
                    {"name": "invoice_no", "data_type": "VARCHAR(20)", "is_nullable": False, "description": "Invoice number"},
                    {"name": "quantity", "data_type": "INTEGER", "is_nullable": False, "description": "Quantity sold"},
                    {"name": "unit_price", "data_type": "NUMERIC(10,2)", "is_nullable": False, "description": "Price per unit"},
                ]
            }
        ]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/schema")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data["tables"]) == 1
            assert data["tables"][0]["table_name"] == "query_lens"


@pytest.mark.anyio
async def test_query_ambiguous_scenario():
    """Test scenario: user asks vague query 'get me total sales' -> triggers clarification."""
    mock_ambiguity = {
        "ambiguous": True,
        "clarifying_question": "How would you like to view total sales?",
        "options": ["Total overall", "By year", "By country"],
        "reasoning": "Missing grouping dimension"
    }

    with patch("app.api.routes_query.detect_ambiguity", new_callable=AsyncMock) as mock_detect:
        mock_detect.return_value = mock_ambiguity

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/query", json={"query": "get me total sales"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "clarification_needed"
            assert data["clarifying_question"] == "How would you like to view total sales?"
            assert "By year" in data["options"]
            assert data["session_id"] is not None


@pytest.mark.anyio
async def test_query_clear_scenario():
    """Test scenario: user asks clear query -> generates and executes SQL -> returns chart & table."""
    mock_ambiguity = {"ambiguous": False}
    mock_sql_gen = {
        "sql": "SELECT COUNT(DISTINCT customer_id) AS unique_customers FROM query_lens LIMIT 1000",
        "explanation": "Counts distinct customer IDs."
    }

    with patch("app.api.routes_query.detect_ambiguity", new_callable=AsyncMock) as mock_detect, \
         patch("app.api.routes_query.generate_sql", new_callable=AsyncMock) as mock_gen, \
         patch("app.api.routes_query.validate_sql", new_callable=AsyncMock) as mock_val, \
         patch("app.api.routes_query.get_db_session") as mock_db:

        mock_detect.return_value = mock_ambiguity
        mock_gen.return_value = mock_sql_gen
        mock_val.return_value = mock_sql_gen["sql"]

        # Mock DB execution
        class MockResult:
            def keys(self):
                return ["unique_customers"]
            def fetchall(self):
                return [[4372]]

        mock_session = AsyncMock()
        mock_session.execute.return_value = MockResult()
        mock_session.__aenter__.return_value = mock_session
        mock_session.__aexit__.return_value = None
        mock_db.return_value = mock_session

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/query", json={"query": "how many unique customers do we have?"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert data["columns"] == ["unique_customers"]
            assert data["rows"] == [[4372]]
            assert data["chart_suggestion"] == "number_card"
            assert "SELECT" in data["sql"]


@pytest.mark.anyio
async def test_clarify_flow_scenario():
    """Test scenario: user chooses a clarification option -> executes resolved query."""
    mock_sql_gen = {
        "sql": "SELECT EXTRACT(YEAR FROM invoice_date) AS year, SUM(quantity * unit_price) AS total_sales FROM query_lens GROUP BY 1 ORDER BY 1 LIMIT 1000",
        "explanation": "Calculates total sales grouped by year."
    }

    with patch("app.api.routes_query.generate_sql", new_callable=AsyncMock) as mock_gen, \
         patch("app.api.routes_query.validate_sql", new_callable=AsyncMock) as mock_val, \
         patch("app.api.routes_query.get_db_session") as mock_db:

        mock_gen.return_value = mock_sql_gen
        mock_val.return_value = mock_sql_gen["sql"]

        class MockResult:
            def keys(self):
                return ["year", "total_sales"]
            def fetchall(self):
                return [[2010, 748957.02], [2011, 8998790.91]]

        mock_session = AsyncMock()
        mock_session.execute.return_value = MockResult()
        mock_session.__aenter__.return_value = mock_session
        mock_session.__aexit__.return_value = None
        mock_db.return_value = mock_session

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/clarify", json={
                "session_id": "test-session-123",
                "original_query": "get me total sales",
                "clarification": "by year"
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert data["columns"] == ["year", "total_sales"]
            assert len(data["rows"]) == 2
            assert data["chart_suggestion"] == "line"


@pytest.mark.anyio
async def test_sql_validation_failure_scenario():
    """Test scenario: generated SQL fails validation (e.g. DML injection attempt)."""
    mock_ambiguity = {"ambiguous": False}
    mock_sql_gen = {
        "sql": "DROP TABLE query_lens",
        "explanation": "Malicious or invalid query"
    }

    with patch("app.api.routes_query.detect_ambiguity", new_callable=AsyncMock) as mock_detect, \
         patch("app.api.routes_query.generate_sql", new_callable=AsyncMock) as mock_gen:

        mock_detect.return_value = mock_ambiguity
        mock_gen.return_value = mock_sql_gen

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/query", json={"query": "drop the table"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "error"
            assert "validation" in data["error_message"].lower()
