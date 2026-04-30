"""
LLM provider abstraction — swap OpenAI ↔ Anthropic ↔ local via config.
"""
from abc import ABC, abstractmethod
from typing import Any
import json
import structlog

from app.config import get_settings
from app.schemas.analysis import ExplainResult, ChatMessage

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


class LLMProvider(ABC):
    @abstractmethod
    async def explain(self, text: str, lang: str = "de") -> ExplainResult:
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

    async def explain(self, text: str, lang: str = "de") -> ExplainResult:
        system = EXPLAIN_SYSTEM_DE if lang == "de" else EXPLAIN_SYSTEM_DE  # extend per lang
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
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
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

    async def explain(self, text: str, lang: str = "de") -> ExplainResult:
        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=EXPLAIN_SYSTEM_DE,
            messages=[{"role": "user", "content": f"Dokument:\n\n{text[:8000]}"}],
            temperature=0.1,
        )
        raw = resp.content[0].text if resp.content else "{}"
        data = json.loads(raw)
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

    async def explain(self, text: str, lang: str = "de") -> ExplainResult:
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
