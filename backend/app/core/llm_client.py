"""Thin wrapper around the OpenAI SDK (via OpenRouter) for structured JSON responses."""

import json
import logging
import os

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level client (created lazily)
_client: OpenAI | None = None


def _get_client() -> OpenAI:
    """Return or create the OpenAI client singleton pointing at OpenRouter."""
    global _client
    if _client is None:
        api_key = settings.openrouter_api_key or os.getenv("OPENROUTER_API_KEY", "")
        base_url = settings.openrouter_base_url or os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        )
        if not api_key:
            logger.warning("OPENROUTER_API_KEY is not set in environment variables or settings.")
        _client = OpenAI(
            base_url=base_url,
            api_key=api_key or "missing_key",
        )
    return _client


async def ask_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 2048,
) -> dict:
    """Send a message to the LLM via OpenRouter and parse the response as JSON.

    Args:
        system_prompt: System-level instructions for the model.
        user_prompt: The user's message content.
        temperature: Sampling temperature (low for deterministic output).
        max_tokens: Maximum tokens in the response.

    Returns:
        Parsed JSON dict from the model's response.

    Raises:
        ValueError: If the model's response is not valid JSON.
    """
    client = _get_client()

    logger.info("LLM request | model=%s temp=%.2f", settings.llm_model, temperature)
    logger.debug("System prompt:\n%s", system_prompt)
    logger.debug("User prompt:\n%s", user_prompt)

    response = client.chat.completions.create(
        model=settings.llm_model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw_text = response.choices[0].message.content.strip()
    logger.debug("LLM raw response:\n%s", raw_text)

    # Strip markdown fences if the model wraps output despite instructions
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw_text = "\n".join(lines).strip()

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM response as JSON: %s", raw_text)
        raise ValueError(f"LLM returned invalid JSON: {exc}") from exc

    return result
