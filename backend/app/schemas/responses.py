"""Pydantic response models for the API."""

from typing import Any

from pydantic import BaseModel, Field


class QueryResponse(BaseModel):
    """Response for POST /api/query and POST /api/clarify.

    Uses a union-style approach: when status is 'clarification_needed',
    the clarifying_question and options fields are populated.
    When status is 'ok', the columns/rows/sql/chart fields are populated.
    """

    status: str = Field(
        ...,
        description="'ok' for results, 'clarification_needed' for ambiguous queries, 'error' for failures",
    )

    # Clarification fields (present when status == 'clarification_needed')
    clarifying_question: str | None = Field(
        default=None,
        description="Question to ask the user for disambiguation",
    )
    options: list[str] | None = Field(
        default=None,
        description="Clarification options for the user to choose from",
    )

    # Result fields (present when status == 'ok')
    columns: list[str] | None = Field(
        default=None,
        description="Column names of the result set",
    )
    rows: list[list[Any]] | None = Field(
        default=None,
        description="Result rows as a list of lists",
    )
    sql: str | None = Field(
        default=None,
        description="The generated SQL query",
    )
    explanation: str | None = Field(
        default=None,
        description="LLM explanation of how the SQL was generated",
    )
    chart_suggestion: str | None = Field(
        default=None,
        description="Suggested chart type: bar, line, pie, number_card, table, grouped_bar, multi_line",
    )
    x_column: str | None = Field(
        default=None,
        description="Suggested X-axis column for charts",
    )
    y_columns: list[str] | None = Field(
        default=None,
        description="Suggested Y-axis column(s) for charts",
    )

    # Session tracking
    session_id: str | None = Field(
        default=None,
        description="Session identifier for tracking ambiguous query flows",
    )

    # Error details
    error_message: str | None = Field(
        default=None,
        description="Error details when status is 'error'",
    )


class ColumnInfo(BaseModel):
    """Schema information for a single column."""

    name: str
    data_type: str
    is_nullable: bool
    description: str | None = None


class TableInfo(BaseModel):
    """Schema information for a single table."""

    table_name: str
    columns: list[ColumnInfo]


class SchemaResponse(BaseModel):
    """Response for GET /api/schema."""

    tables: list[TableInfo]


class HealthResponse(BaseModel):
    """Response for GET /api/health."""

    status: str
    database: str
