"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings, read from .env or environment variables."""

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://readonly_user:readonly_pass@db:5432/querylens",
        alias="DATABASE_URL",
    )

    # OpenRouter LLM
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1", alias="OPENROUTER_BASE_URL"
    )
    llm_model: str = Field(default="anthropic/claude-sonnet-4", alias="LLM_MODEL")

    # Query safety
    query_row_limit: int = Field(default=1000, alias="QUERY_ROW_LIMIT")
    query_timeout_seconds: int = Field(default=5, alias="QUERY_TIMEOUT_SECONDS")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Singleton settings instance
settings = Settings()
