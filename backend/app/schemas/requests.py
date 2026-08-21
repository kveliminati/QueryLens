"""Pydantic request models for the API."""

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request body for POST /api/query."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Natural language business question",
        examples=["get me total sales", "how many customers do we have?"],
    )


class ClarifyRequest(BaseModel):
    """Request body for POST /api/clarify."""

    session_id: str = Field(
        ...,
        description="Session ID returned by the /query endpoint",
    )
    original_query: str = Field(
        ...,
        min_length=1,
        description="The original natural language query",
    )
    clarification: str = Field(
        ...,
        min_length=1,
        description="The user's chosen clarification option",
    )
