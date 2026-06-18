"""
Isolated Gemini client for extraction eval — not used by production decision_worker.
"""
from __future__ import annotations

import os
import time
from typing import Any

import httpx

from app.services.llm import EXPLAIN_SYSTEM_DE, ExplainJsonParseError, parse_explain_json

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def gemini_api_key() -> str | None:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    return key or None


def gemini_model() -> str:
    return os.environ.get("GEMINI_MODEL", "").strip() or DEFAULT_GEMINI_MODEL


def _usage_cost_hint(usage: dict[str, Any] | None) -> str:
    if not usage:
        return "unknown"
    prompt = usage.get("promptTokenCount") or usage.get("prompt_token_count")
    output = usage.get("candidatesTokenCount") or usage.get("candidates_token_count")
    if prompt is None and output is None:
        return "unknown"
    return f"tokens_in={prompt or 0},tokens_out={output or 0}"


async def gemini_extract(raw_text: str, *, lang: str = "de") -> dict[str, Any]:
    """
    Call Gemini Flash with the same German extraction JSON schema as production explain().
    Returns dict with extracted fields plus eval metadata keys (_latency_ms, _valid_json, _cost_hint).
  """
    api_key = gemini_api_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set — skip Gemini eval provider")

    model = gemini_model()
    url = f"{_GEMINI_BASE}/{model}:generateContent"
    system = EXPLAIN_SYSTEM_DE if lang == "de" else EXPLAIN_SYSTEM_DE
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"Dokument:\n\n{raw_text[:8000]}"}],
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
        },
    }

    started = time.perf_counter()
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, params={"key": api_key}, json=payload)
        resp.raise_for_status()
        body = resp.json()

    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    candidates = body.get("candidates") or []
    if not candidates:
        raise ExplainJsonParseError("Gemini response has no candidates")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    raw = "\n".join(p.get("text", "") for p in parts if p.get("text")).strip()
    if not raw:
        raise ExplainJsonParseError("Gemini response is empty (no text)")

    try:
        data = parse_explain_json(raw)
        valid_json = True
    except ExplainJsonParseError:
        valid_json = False
        raise

    usage = body.get("usageMetadata") or body.get("usage_metadata")
    data["text"] = raw_text[:500]
    data["confidence"] = 0.85
    data["_latency_ms"] = latency_ms
    data["_valid_json"] = valid_json
    data["_cost_hint"] = _usage_cost_hint(usage if isinstance(usage, dict) else None)
    data["_model"] = model
    return data
