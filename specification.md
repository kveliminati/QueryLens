# Ambiguity-Aware Natural Language to SQL App — Specification

## 1. Overview

A web application that accepts natural language business questions (e.g. "get me total sales"), detects when the query is ambiguous, asks the user a clarifying question, then dynamically generates and executes a SQL query against a PostgreSQL database. Results are returned as both a data table and a chart.

**Stack**
- Frontend: React
- Backend: Python, FastAPI
- Database: PostgreSQL
- LLM: Claude API (Anthropic)

---

## 2. Goals

- Reduce back-and-forth friction when users ask vague analytics questions.
- Avoid generating misleading or incorrect SQL by resolving ambiguity before query generation.
- Present results in both tabular and visual form without requiring the user to specify chart type.

### Non-goals (v1)
- Multi-turn conversational analytics (e.g. follow-up questions that modify a previous result) — out of scope for v1, may be considered later.
- Write operations (INSERT/UPDATE/DELETE) — the system is read-only.
- Support for databases other than PostgreSQL.

---

## 3. High-Level Architecture

```
React frontend
      |
      v
FastAPI backend
      |
      +--> Ambiguity Detector (LLM call)
      |         |
      |         +--> if ambiguous --> Clarification payload --> back to frontend
      |
      +--> SQL Generator (LLM call, schema-aware)
      |
      +--> SQL Validator (read-only allowlist, EXPLAIN check)
      |
      +--> SQL Executor --> PostgreSQL (read-only role)
      |
      v
Response: { columns, rows, chart_suggestion }
      |
      v
React frontend renders Table + Chart
```

---

## 4. Backend Design (Python + FastAPI)

### 4.1 Project structure

```
backend/
  app/
    main.py                  # FastAPI app entrypoint
    api/
      routes_query.py        # /query, /clarify, /execute endpoints
    services/
      ambiguity_service.py   # LLM call for ambiguity detection
      sql_generation_service.py  # LLM call for SQL generation
      sql_validation_service.py  # SELECT-only allowlist, EXPLAIN check
      schema_service.py      # introspects Postgres schema, caches metadata
      chart_suggestion_service.py # picks chart type from result shape
    db/
      session.py             # SQLAlchemy engine/session (read-only role)
      models.py               # ORM models (optional, mainly for schema introspection)
    core/
      config.py               # env vars, settings
      llm_client.py            # wraps Anthropic API calls
    schemas/
      requests.py              # Pydantic request models
      responses.py             # Pydantic response models
  tests/
  requirements.txt
  Dockerfile
```

### 4.2 Key libraries

| Purpose | Library |
|---|---|
| Web framework | `fastapi` |
| ASGI server | `uvicorn` |
| DB driver / ORM | `sqlalchemy` (2.x), `psycopg` (or `asyncpg` for async) |
| Data validation | `pydantic` (v2) |
| LLM client | `anthropic` (official SDK) |
| Env config | `pydantic-settings` |
| Testing | `pytest`, `httpx` |

### 4.3 API Endpoints

#### `POST /api/query`
Accepts a raw natural language query. Runs ambiguity detection.

**Request**
```json
{ "query": "get me total sales" }
```

**Response — ambiguous case**
```json
{
  "status": "clarification_needed",
  "clarifying_question": "Would you like this broken down by year, category, or region?",
  "options": ["By year", "By category", "By region", "Total only"],
  "session_id": "uuid"
}
```

**Response — clear case** (proceeds directly to generation, see `/execute` shape below)
```json
{
  "status": "ok",
  "columns": ["total_sales"],
  "rows": [[9747747.93]],
  "sql": "SELECT SUM(quantity * unit_price) AS total_sales FROM query_lens WHERE invoice_no NOT LIKE 'C%';",
  "chart_suggestion": "number_card",
  "session_id": "uuid"
}
```

#### `POST /api/clarify`
Accepts the original query plus the user's clarification choice. Proceeds to SQL generation and execution.

**Request**
```json
{
  "session_id": "uuid",
  "original_query": "get me total sales",
  "clarification": "by year"
}
```

**Response**
```json
{
  "status": "ok",
  "columns": ["year", "total_sales"],
  "rows": [[2010, 748957.02], [2011, 8998790.91]],
  "sql": "SELECT EXTRACT(YEAR FROM invoice_date) AS year, SUM(quantity * unit_price) AS total_sales FROM query_lens WHERE invoice_no NOT LIKE 'C%' GROUP BY 1 ORDER BY 1;",
  "chart_suggestion": "line"
}
```

#### `GET /api/schema`
Returns cached schema metadata (tables, columns, types) — used for debugging/admin, and internally by the LLM prompt builders.

#### `GET /api/health`
Basic liveness/readiness check.

---

## 5. Ambiguity Detection

### 5.1 Approach
Single LLM call with:
- The user's raw query
- A condensed schema summary (table names, column names/types, short descriptions)
- Instructions to return **strict JSON only**

### 5.2 Signals that indicate ambiguity
- Missing time range / period ("total sales" — since when? which year?)
- Missing grouping dimension when the question implies a breakdown is likely useful
- Vague metric definitions ("performance", "sales" without specifying gross/net/refunded)
- Missing filters that materially change the result (region, product line, customer segment)
- Pronouns or references with no prior context ("that", "those" — in v1 this triggers a request for clarification since there is no conversational memory)

### 5.3 Expected LLM output schema
```json
{
  "ambiguous": true,
  "clarifying_question": "string",
  "options": ["string", "..."],
  "reasoning": "string (internal only, not shown to user)"
}
```

### 5.4 Prompt design notes
- System prompt instructs the model to output valid JSON only, no prose, no markdown fences.
- Include 2–3 few-shot examples covering: a clearly ambiguous query, a clearly unambiguous query, and a borderline case.
- Temperature should be low (e.g. 0–0.2) for consistency.

---

## 6. SQL Generation

### 6.1 Approach
Second LLM call, given:
- The resolved/clarified natural language intent
- Full schema context (table names, columns, types, primary/foreign keys, short semantic descriptions)
- Dialect: PostgreSQL
- Constraints: SELECT-only, must include a LIMIT, must use explicit column aliases

### 6.2 Expected LLM output schema
```json
{
  "sql": "SELECT ...",
  "explanation": "string (optional, shown to user in a collapsible 'how this was generated' section)"
}
```

### 6.3 Schema context strategy
- **v1**: inject the full schema (assumes a small-to-medium schema, e.g. under ~20 tables).
- **Future**: retrieve only relevant tables via embedding similarity search (RAG) once schema size grows.

---

## 7. SQL Validation & Execution

### 7.1 Validation rules (enforced in code, not trusted from the LLM)
- Reject any statement that is not a single `SELECT` statement (block `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, multiple statements separated by `;`, etc.)
- Enforce a `LIMIT` clause; inject one server-side if missing (e.g. `LIMIT 1000`)
- Run `EXPLAIN` on the query first; if it errors, return a generation failure rather than executing
- Enforce a query timeout (e.g. `statement_timeout` set at the session level, 5 seconds)
- Execute using a dedicated **read-only PostgreSQL role** with no write grants, as defense in depth

### 7.2 Execution
- Use SQLAlchemy with a read-only DB session
- Return column names and rows as JSON-serializable types (convert `Decimal`, `datetime`, etc.)

---

## 8. Chart Suggestion Logic

Rule-based (v1), based on the shape of the result set:

| Result shape | Suggested chart |
|---|---|
| 1 row, 1 numeric column | Number card |
| 1 categorical column + 1 numeric column, low cardinality (≤ ~15 categories) | Bar chart |
| 1 time/date column + 1 numeric column | Line chart |
| 1 categorical column + 1 numeric column, used for share-of-total | Pie chart (only if explicitly implied, e.g. "share of sales by category") |
| 2+ numeric columns across a shared dimension | Grouped/stacked bar or multi-line chart |
| High-cardinality categorical (> ~15 categories) | Table only, no chart suggested |

This logic lives in `chart_suggestion_service.py` and returns a `chart_suggestion` string plus any axis mapping hints (`x_column`, `y_column(s)`).

---

## 9. Frontend Design (React)

### 9.1 Key components
- `QueryInput` — text box for natural language query
- `ClarificationPrompt` — renders the clarifying question with option buttons (multi-select or single-select depending on `options` shape)
- `ResultsTable` — sortable data table
- `ResultsChart` — renders bar/line/pie/number-card based on `chart_suggestion`
- `SqlDisclosure` — optional collapsible panel showing the generated SQL for transparency/trust

### 9.2 State flow
1. User submits query → `POST /api/query`
2. If `status === "clarification_needed"` → render `ClarificationPrompt`, wait for user selection
3. On selection → `POST /api/clarify` with `session_id`, `original_query`, `clarification`
4. On `status === "ok"` from either endpoint → render `ResultsTable` + `ResultsChart`

### 9.3 Libraries
- Charting: `recharts` (or `chart.js`)
- Table: a lightweight table component or `@tanstack/react-table` for sorting

---

## 10. Data Model / Schema Introspection

- `schema_service.py` connects to Postgres on startup (or on a cache-refresh interval) and introspects:
  - Table names
  - Column names, types, nullability
  - Primary and foreign keys
  - Optionally: a manually maintained `schema_descriptions.yaml` file where the developer adds human-readable descriptions per table/column, which significantly improves LLM SQL accuracy
- This metadata is cached in memory and refreshed periodically or via an admin endpoint

### 10.1 Reference dataset — `query_lens`

The initial dataset used for development and testing is a retail transactions table (UK e-commerce style invoice data).

**Table DDL**
```sql
CREATE TABLE query_lens (
    invoice_no    VARCHAR(20)     NOT NULL,
    stock_code    VARCHAR(20)     NOT NULL,
    description   TEXT,
    quantity      INTEGER         NOT NULL,
    invoice_date  TIMESTAMP       NOT NULL,
    unit_price    NUMERIC(10, 2)  NOT NULL,
    customer_id   INTEGER,
    country       VARCHAR(100)    NOT NULL
);

CREATE INDEX idx_query_lens_invoice_date ON query_lens (invoice_date);
CREATE INDEX idx_query_lens_customer_id  ON query_lens (customer_id);
CREATE INDEX idx_query_lens_country      ON query_lens (country);
CREATE INDEX idx_query_lens_stock_code   ON query_lens (stock_code);
```

**Column reference** (used to build the schema context injected into LLM prompts)

| Column | Type | Description |
|---|---|---|
| `invoice_no` | VARCHAR(20) | Invoice/transaction identifier. Multiple rows share the same invoice_no when a single order contains multiple line items. A prefix of "C" indicates a cancelled/credit transaction (present in the source data as a string, worth normalizing or flagging during ingestion). |
| `stock_code` | VARCHAR(20) | Product/SKU identifier. |
| `description` | TEXT | Product name/description. |
| `quantity` | INTEGER | Units purchased. Can be negative for returns/cancellations. |
| `invoice_date` | TIMESTAMP | Date and time of the transaction. |
| `unit_price` | NUMERIC(10,2) | Price per unit, in the source currency (GBP). |
| `customer_id` | INTEGER | Customer identifier. Nullable — some transactions have no associated customer (e.g. guest/anonymous orders). |
| `country` | VARCHAR(100) | Customer's country. |

**Derived/common metric**: `total_sales` or `line_total` = `quantity * unit_price`, computed at query time (not a stored column) since not every query needs it and it must correctly account for negative quantities (returns).

**Sample rows**
```csv
InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice,CustomerID,Country
536365,85123A,WHITE HANGING HEART T-LIGHT HOLDER,6,12/1/2010 8:26,2.55,17850,United Kingdom
536365,71053,WHITE METAL LANTERN,6,12/1/2010 8:26,3.39,17850,United Kingdom
536365,84406B,CREAM CUPID HEARTS COAT HANGER,8,12/1/2010 8:26,2.75,17850,United Kingdom
```

**Ambiguity implications specific to this dataset**
- "Total sales" is ambiguous between `SUM(quantity * unit_price)` gross vs. a version that excludes cancelled invoices (`invoice_no LIKE 'C%'`) or negative-quantity rows.
- "Customers" queries should clarify whether to include NULL `customer_id` rows (guest orders) or exclude them.
- Date-based queries should clarify granularity (day/month/year) since `invoice_date` is a full timestamp.
- "Top products" is ambiguous between ranking by quantity sold vs. revenue.

---

## 11. Security Considerations

- **Read-only DB role**: the application's DB user has `SELECT` only, no DML/DDL grants.
- **Statement allowlisting**: only single `SELECT` statements pass validation.
- **No direct user SQL**: users never write SQL directly; only the LLM does, and its output is validated before execution.
- **Row limits & timeouts**: prevent runaway or resource-exhausting queries.
- **Prompt injection awareness**: the user's natural language query is untrusted input passed into an LLM prompt — the system prompt should clearly delineate instructions vs. user content, and the SQL validator remains the actual security boundary (not the LLM's good behavior).
- **PII/sensitive columns**: maintain a denylist of columns/tables to exclude from schema context if the database contains sensitive data not meant to be queryable via this interface.

---

## 12. Environment & Configuration

```
# .env
DATABASE_URL=postgresql+psycopg://readonly_user:***@host:5432/dbname
ANTHROPIC_API_KEY=***
LLM_MODEL=claude-sonnet-4-6
QUERY_ROW_LIMIT=1000
QUERY_TIMEOUT_SECONDS=5
```

---

## 13. Deployment Notes

- FastAPI app served via `uvicorn`/`gunicorn` behind a reverse proxy
- Dockerize backend and frontend separately; `docker-compose` for local dev including a Postgres instance
- Postgres: separate read-only role provisioned via migration/init script, distinct from the app's own metadata storage (if any) or the primary transactional DB being queried

---

## 14. Open Questions / Decisions Needed

- Should clarification support **multi-select** (e.g. "by year AND category") or single-select only in v1?
- Should the generated SQL be shown to the user by default, or hidden behind a toggle?
- Should there be a session/conversation history so users can revisit past queries?
- What is the target schema size, and is RAG-based schema retrieval needed for v1 or can it be deferred?

---

## 15. Milestones (Suggested)

1. **M1** — FastAPI skeleton, Postgres connection, schema introspection endpoint
2. **M2** — Ambiguity detection service + `/api/query` endpoint (no SQL generation yet, stubbed response)
3. **M3** — SQL generation + validation + execution, end-to-end for unambiguous queries
4. **M4** — Clarification flow wired end-to-end (`/api/clarify`)
5. **M5** — React frontend: query input, clarification UI, table rendering
6. **M6** — Chart suggestion logic + chart rendering
7. **M7** — Security hardening (read-only role, timeouts, row limits), basic test coverage
