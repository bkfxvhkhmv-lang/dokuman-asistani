"""
Eval-only extraction providers — parser baseline + optional LLM backends.

Does not alter production LLM_PROVIDER or decision_worker behavior.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.config import get_settings
from app.services.eval_extraction_scorer import FixtureScore, score_extraction
from app.services.gemini_eval import gemini_extract
from app.services.local_document_parser import parse_local_document_dict
from app.services.llm import AnthropicProvider, ExplainJsonParseError
from app.services.mistral_eval import mistral_extract

settings = get_settings()


@dataclass
class ProviderRunResult:
    provider: str
    fixture_id: str
    extracted: dict[str, Any] = field(default_factory=dict)
    valid_json: bool = True
    latency_ms: float | None = None
    estimated_cost: str = "unknown"
    skipped: bool = False
    skip_reason: str | None = None
    error: str | None = None


class ExtractionEvalProvider(Protocol):
    name: str

    async def extract(self, raw_text: str) -> ProviderRunResult:
        ...


class ParserEvalProvider:
    name = "parser"

    async def extract(self, raw_text: str) -> ProviderRunResult:
        started = time.perf_counter()
        extracted = parse_local_document_dict(raw_text)
        latency_ms = round((time.perf_counter() - started) * 1000, 1)
        return ProviderRunResult(
            provider=self.name,
            fixture_id="",
            extracted=extracted,
            valid_json=True,
            latency_ms=latency_ms,
            estimated_cost="0",
        )


class AnthropicEvalProvider:
    name = "anthropic"

    def is_available(self) -> tuple[bool, str | None]:
        key = settings.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not key:
            return False, "ANTHROPIC_API_KEY not set — skipping anthropic eval provider"
        return True, None

    async def extract(self, raw_text: str) -> ProviderRunResult:
        ok, reason = self.is_available()
        if not ok:
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                skipped=True,
                skip_reason=reason,
            )

        started = time.perf_counter()
        try:
            provider = AnthropicProvider()
            result = await provider.explain(raw_text, lang="de")
            extracted = result.model_dump()
            extracted.pop("text", None)
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                extracted=extracted,
                valid_json=True,
                latency_ms=round((time.perf_counter() - started) * 1000, 1),
                estimated_cost="unknown",
            )
        except ExplainJsonParseError as exc:
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                valid_json=False,
                latency_ms=round((time.perf_counter() - started) * 1000, 1),
                error=str(exc),
            )


class GeminiEvalProvider:
    name = "gemini"

    def is_available(self) -> tuple[bool, str | None]:
        key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            return False, "GEMINI_API_KEY not set — skipping gemini eval provider"
        return True, None

    async def extract(self, raw_text: str) -> ProviderRunResult:
        ok, reason = self.is_available()
        if not ok:
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                skipped=True,
                skip_reason=reason,
            )

        started = time.perf_counter()
        try:
            data = await gemini_extract(raw_text)
            latency_ms = data.pop("_latency_ms", round((time.perf_counter() - started) * 1000, 1))
            cost = data.pop("_cost_hint", "unknown")
            data.pop("_valid_json", None)
            data.pop("_model", None)
            data.pop("text", None)
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                extracted=data,
                valid_json=True,
                latency_ms=latency_ms,
                estimated_cost=cost,
            )
        except Exception as exc:  # noqa: BLE001 — eval CLI reports provider errors
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                valid_json=False,
                latency_ms=round((time.perf_counter() - started) * 1000, 1),
                error=str(exc),
            )


class MistralEvalProvider:
    name = "mistral"

    def is_available(self) -> tuple[bool, str | None]:
        key = os.environ.get("MISTRAL_API_KEY", "").strip()
        if not key:
            return False, "MISTRAL_API_KEY not set — skipping mistral eval provider"
        return True, None

    async def extract(self, raw_text: str) -> ProviderRunResult:
        ok, reason = self.is_available()
        if not ok:
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                skipped=True,
                skip_reason=reason,
            )

        started = time.perf_counter()
        try:
            data = await mistral_extract(raw_text)
            latency_ms = data.pop("_latency_ms", round((time.perf_counter() - started) * 1000, 1))
            cost = data.pop("_cost_hint", "unknown")
            data.pop("_valid_json", None)
            data.pop("_model", None)
            data.pop("text", None)
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                extracted=data,
                valid_json=True,
                latency_ms=latency_ms,
                estimated_cost=cost,
            )
        except ExplainJsonParseError as exc:
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                valid_json=False,
                latency_ms=round((time.perf_counter() - started) * 1000, 1),
                error=str(exc),
            )
        except Exception as exc:  # noqa: BLE001 — eval CLI reports provider errors
            return ProviderRunResult(
                provider=self.name,
                fixture_id="",
                valid_json=False,
                latency_ms=round((time.perf_counter() - started) * 1000, 1),
                error=str(exc),
            )


_PROVIDER_MAP: dict[str, type] = {
    "parser": ParserEvalProvider,
    "anthropic": AnthropicEvalProvider,
    "gemini": GeminiEvalProvider,
    "mistral": MistralEvalProvider,
}


def resolve_providers(names: list[str]) -> list[ExtractionEvalProvider]:
    providers: list[ExtractionEvalProvider] = []
    for name in names:
        key = name.strip().lower()
        cls = _PROVIDER_MAP.get(key)
        if cls is None:
            raise ValueError(f"Unknown eval provider: {name!r} (known: {', '.join(_PROVIDER_MAP)})")
        providers.append(cls())
    return providers


async def run_fixture_eval(
    fixture: dict[str, Any],
    providers: list[ExtractionEvalProvider],
) -> list[FixtureScore]:
    fixture_id = fixture["id"]
    raw_text = fixture["raw_text"]
    expected = fixture.get("expected") or {}
    scores: list[FixtureScore] = []

    for provider in providers:
        run = await provider.extract(raw_text)
        run.fixture_id = fixture_id
        if run.skipped:
            scores.append(
                score_extraction(
                    fixture_id,
                    provider.name,
                    {},
                    expected,
                    skipped=True,
                    skip_reason=run.skip_reason,
                )
            )
            continue
        if run.error and not run.extracted:
            scores.append(
                score_extraction(
                    fixture_id,
                    provider.name,
                    {},
                    expected,
                    valid_json=run.valid_json,
                    latency_ms=run.latency_ms,
                    estimated_cost=run.estimated_cost,
                )
            )
            continue
        scores.append(
            score_extraction(
                fixture_id,
                provider.name,
                run.extracted,
                expected,
                valid_json=run.valid_json,
                latency_ms=run.latency_ms,
                estimated_cost=run.estimated_cost,
            )
        )
    return scores
