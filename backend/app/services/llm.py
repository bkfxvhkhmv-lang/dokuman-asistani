"""
LLM provider abstraction — swap OpenAI ↔ Anthropic ↔ local via config.
"""
from abc import ABC, abstractmethod
import json
import re
import time
from json import JSONDecodeError
import structlog

from app.config import get_settings
from app.schemas.analysis import ExplainResult, ChatMessage
from app.services.llm_usage import emit_extraction_usage, persist_usage_event

log = structlog.get_logger()
settings = get_settings()

EXPLAIN_SYSTEM_DE = """Du bist ein KI-Assistent, der deutsche Behördenbriefe, Rechnungen und offizielle Dokumente analysiert.

Analysiere das Dokument und antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "titel": "Kurzer Dokumententitel",
  "zusammenfassung": "Detaillierte Zusammenfassung (2-4 Sätze)",
  "kurzfassung": "Ein-Satz-Zusammenfassung",
  "typ": "Mahnung|Rechnung|Bescheid|Termin|Vertrag|Mitteilung|Sonstiges",
  "risiko": "hoch|mittel|niedrig",
  "betrag": 123.45,
  "frist": "2025-12-31",
  "iban": "DE...",
  "aktionen": ["zahlen", "einspruch", "kalender", "antworten"],
  "warnung": "Wichtiger Warnhinweis falls vorhanden"
}

Regeln:
- betrag: nur die Zahl (float), null wenn keiner
- frist: ISO-Datum (YYYY-MM-DD), null wenn keines
- iban: nur wenn im Dokument vorhanden, sonst null
- aktionen: aus der Liste: zahlen, einspruch, kalender, antworten, dokument, unterschreiben
- warnung: null wenn keine kritische Warnung
- Antworte NUR mit dem JSON, kein zusätzlicher Text"""


class ExplainJsonParseError(ValueError):
    """Raised when an LLM explain response cannot be parsed as a JSON object."""


def parse_explain_json(raw: str) -> dict:
    """
    Parse explain() model output into a dict.
    Handles plain JSON, ```json fences, and prose-wrapped objects.
    """
    if raw is None:
        raise ExplainJsonParseError("LLM explain response is empty (no content)")

    text = raw.strip()
    if not text:
        raise ExplainJsonParseError("LLM explain response is empty (blank text)")

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
        raise ExplainJsonParseError(
            f"LLM explain response JSON root must be an object, got {type(data).__name__}"
        )
    except JSONDecodeError:
        pass

    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
    if fence:
        try:
            data = json.loads(fence.group(1))
            if isinstance(data, dict):
                return data
        except JSONDecodeError as exc:
            raise ExplainJsonParseError(
                "LLM explain response fenced JSON block could not be parsed"
            ) from exc

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            data = json.loads(text[start : end + 1])
            if isinstance(data, dict):
                return data
        except JSONDecodeError as exc:
            raise ExplainJsonParseError(
                "LLM explain response contains a JSON-like object but parsing failed"
            ) from exc

    preview = text[:120].replace("\n", " ")
    if len(text) > 120:
        preview += "…"
    raise ExplainJsonParseError(
        f"LLM explain response is not valid JSON (preview: {preview!r})"
    )


def _anthropic_text_blocks(content) -> str:
    if not content:
        return ""
    parts: list[str] = []
    for block in content:
        block_type = getattr(block, "type", None)
        if block_type == "text" and getattr(block, "text", None):
            parts.append(block.text)
        elif hasattr(block, "text") and block.text:
            parts.append(block.text)
    return "\n".join(parts).strip()


class LLMProvider(ABC):
    @abstractmethod
    async def explain(
        self,
        text: str,
        lang: str = "de",
        *,
        document_id: str | None = None,
        route: str | None = None,
    ) -> ExplainResult:
        ...

    @abstractmethod
    async def chat(self, messages: list[ChatMessage], context: str, lang: str = "de") -> str:
        ...

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        ...


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.embed_model = "text-embedding-3-small"

    async def explain(
        self,
        text: str,
        lang: str = "de",
        *,
        document_id: str | None = None,
        route: str | None = None,
    ) -> ExplainResult:
        system = EXPLAIN_SYSTEM_DE if lang == "de" else EXPLAIN_SYSTEM_DE  # extend per lang
        t0 = time.perf_counter()
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": f"Dokument:\n\n{text[:8000]}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1024,
        )
        latency_ms = (time.perf_counter() - t0) * 1000
        usage = resp.usage
        in_tok  = usage.prompt_tokens     if usage else None
        out_tok = usage.completion_tokens if usage else None
        tot_tok = usage.total_tokens      if usage else None
        cost = None
        if in_tok is not None and out_tok is not None:
            from app.services.llm_usage import estimate_cost_usd
            cost = estimate_cost_usd(self.model, in_tok, out_tok)
        emit_extraction_usage(
            document_id=document_id,
            route=route,
            provider="openai",
            model=self.model,
            input_tokens=in_tok,
            output_tokens=out_tok,
            total_tokens=tot_tok,
            latency_ms=latency_ms,
        )
        await persist_usage_event(
            feature="extraction",
            route=route or "",
            provider="openai",
            model=self.model,
            document_id=document_id,
            input_tokens=in_tok,
            output_tokens=out_tok,
            total_tokens=tot_tok,
            estimated_cost_usd=cost,
            latency_ms=latency_ms,
        )
        raw = resp.choices[0].message.content or ""
        data = parse_explain_json(raw)
        data["text"] = text[:500]
        data["confidence"] = resp.choices[0].finish_reason == "stop" and 0.92 or 0.6
        return ExplainResult(**data)

    async def chat(self, messages: list[ChatMessage], context: str, lang: str = "de") -> str:
        system = f"Du bist ein Assistent für Dokumentenanalyse. Kontext:\n{context[:3000]}"
        oai_msgs = [{"role": "system", "content": system}]
        oai_msgs += [{"role": m.role, "content": m.content} for m in messages]
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=oai_msgs,
            temperature=0.3,
            max_tokens=512,
        )
        return resp.choices[0].message.content or ""

    async def embed(self, text: str) -> list[float]:
        resp = await self.client.embeddings.create(
            model=self.embed_model,
            input=text[:8000],
        )
        return resp.data[0].embedding


class AnthropicProvider(LLMProvider):
    def __init__(self) -> None:
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.anthropic_model

    async def explain(
        self,
        text: str,
        lang: str = "de",
        *,
        document_id: str | None = None,
        route: str | None = None,
    ) -> ExplainResult:
        # Assistant prefill "{" nudges Claude to continue a JSON object (no markdown preamble).
        t0 = time.perf_counter()
        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=EXPLAIN_SYSTEM_DE,
            messages=[
                {"role": "user", "content": f"Dokument:\n\n{text[:8000]}"},
                {"role": "assistant", "content": "{"},
            ],
            temperature=0.1,
        )
        latency_ms = (time.perf_counter() - t0) * 1000
        usage = resp.usage
        in_tok     = usage.input_tokens  if usage else None
        out_tok    = usage.output_tokens if usage else None
        cache_cre  = getattr(usage, "cache_creation_input_tokens", None) if usage else None
        cache_read = getattr(usage, "cache_read_input_tokens",     None) if usage else None
        tot_tok    = (in_tok + out_tok) if in_tok is not None and out_tok is not None else None
        cost = None
        if in_tok is not None and out_tok is not None:
            from app.services.llm_usage import estimate_cost_usd
            cost = estimate_cost_usd(
                self.model, in_tok, out_tok,
                cache_cre or 0, cache_read or 0,
            )
        emit_extraction_usage(
            document_id=document_id,
            route=route,
            provider="anthropic",
            model=self.model,
            input_tokens=in_tok,
            output_tokens=out_tok,
            total_tokens=tot_tok,
            cache_creation_input_tokens=cache_cre,
            cache_read_input_tokens=cache_read,
            latency_ms=latency_ms,
        )
        await persist_usage_event(
            feature="extraction",
            route=route or "",
            provider="anthropic",
            model=self.model,
            document_id=document_id,
            input_tokens=in_tok,
            output_tokens=out_tok,
            total_tokens=tot_tok,
            cache_creation_input_tokens=cache_cre,
            cache_read_input_tokens=cache_read,
            estimated_cost_usd=cost,
            latency_ms=latency_ms,
        )
        continuation = _anthropic_text_blocks(resp.content)
        if not continuation:
            raise ExplainJsonParseError("Anthropic explain response is empty (no text blocks)")
        raw = continuation if continuation.lstrip().startswith("{") else "{" + continuation
        try:
            data = parse_explain_json(raw)
        except ExplainJsonParseError:
            log.warning(
                "anthropic.explain_json_parse_failed",
                response_chars=len(raw),
                response_preview=raw[:160].replace("\n", " "),
            )
            raise
        data["text"] = text[:500]
        data["confidence"] = 0.92
        return ExplainResult(**data)

    async def chat(self, messages: list[ChatMessage], context: str, lang: str = "de") -> str:
        system = f"Du bist ein Assistent für Dokumentenanalyse. Kontext:\n{context[:3000]}"
        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=512,
            system=system,
            messages=[{"role": m.role, "content": m.content} for m in messages],
        )
        return resp.content[0].text if resp.content else ""

    async def embed(self, text: str) -> list[float]:
        # Anthropic has no embedding model — fall back to a simple zero vector
        # Replace with OpenAI embeddings or a local model as needed
        log.warning("anthropic.embed.not_supported — returning zero vector")
        return [0.0] * 1536


class LocalProvider(LLMProvider):
    """Placeholder for a local LLM (Ollama / llama.cpp). Not yet implemented."""

    async def explain(
        self,
        text: str,
        lang: str = "de",
        *,
        document_id: str | None = None,
        route: str | None = None,
    ) -> ExplainResult:
        return ExplainResult(
            titel="Lokale Analyse",
            zusammenfassung="Lokaler LLM noch nicht konfiguriert.",
            risiko="niedrig",
        )

    async def chat(self, messages: list[ChatMessage], context: str, lang: str = "de") -> str:
        return "Lokaler LLM noch nicht verfügbar."

    async def embed(self, text: str) -> list[float]:
        return [0.0] * 1536


def get_llm() -> LLMProvider:
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return OpenAIProvider()
    if provider == "anthropic":
        return AnthropicProvider()
    return LocalProvider()
