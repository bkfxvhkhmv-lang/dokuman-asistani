"""
Isolated Mistral client for extraction eval — not used by production decision_worker.
"""
from __future__ import annotations

import os
import time
from typing import Any

import httpx

from app.services.llm import EXPLAIN_SYSTEM_DE, ExplainJsonParseError, parse_explain_json

DEFAULT_MISTRAL_MODEL = "mistral-small-latest"
_MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions"


def mistral_api_key() -> str | None:
    key = os.environ.get("MISTRAL_API_KEY", "").strip()
    return key or None


def mistral_model() -> str:
    return os.environ.get("MISTRAL_MODEL", "").strip() or DEFAULT_MISTRAL_MODEL


def _usage_cost_hint(usage: dict[str, Any] | None) -> str:
    if not usage:
        return "unknown"
    prompt = usage.get("prompt_tokens")
    output = usage.get("completion_tokens")
    if prompt is None and output is None:
        return "unknown"
    return f"tokens_in={prompt or 0},tokens_out={output or 0}"


async def mistral_extract(raw_text: str, *, lang: str = "de") -> dict[str, Any]:
    """
    Call Mistral chat completions with the same German extraction JSON schema as production explain().
    Returns dict with extracted fields plus eval metadata keys (_latency_ms, _valid_json, _cost_hint, _model).
    """
    api_key = mistral_api_key()
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY not set — skip Mistral eval provider")

    model = mistral_model()
    system = EXPLAIN_SYSTEM_DE if lang == "de" else EXPLAIN_SYSTEM_DE
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Dokument:\n\n{raw_text[:8000]}"},
        ],
        "temperature": 0.1,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"},
    }

    started = time.perf_counter()
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            _MISTRAL_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )
        resp.raise_for_status()
        body = resp.json()

    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    choices = body.get("choices") or []
    if not choices:
        raise ExplainJsonParseError("Mistral response has no choices")

    raw = (choices[0].get("message") or {}).get("content", "").strip()
    if not raw:
        raise ExplainJsonParseError("Mistral response is empty (no content)")

    data = parse_explain_json(raw)
    usage = body.get("usage")
    data["text"] = raw_text[:500]
    data["confidence"] = 0.85
    data["_latency_ms"] = latency_ms
    data["_valid_json"] = True
    data["_cost_hint"] = _usage_cost_hint(usage if isinstance(usage, dict) else None)
    data["_model"] = model
    return data
