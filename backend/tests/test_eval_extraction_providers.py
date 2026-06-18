"""Unit tests for eval extraction providers (no network)."""
import asyncio
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.eval_extraction_providers import (
    AnthropicEvalProvider,
    GeminiEvalProvider,
    MistralEvalProvider,
    ParserEvalProvider,
    resolve_providers,
    run_fixture_eval,
)
from app.services.llm import ExplainJsonParseError, parse_explain_json


FIXTURE = {
    "id": "sample",
    "raw_text": "Gebr. Alt GmbH\nRechnung\nGesamtbetrag 10,00 EUR",
    "expected": {"document_type": "Rechnung", "amount": 10.0},
}


def test_resolve_providers_parser_only():
    providers = resolve_providers(["parser"])
    assert len(providers) == 1
    assert providers[0].name == "parser"


def test_resolve_providers_includes_mistral():
    providers = resolve_providers(["parser", "mistral"])
    assert [provider.name for provider in providers] == ["parser", "mistral"]


def test_parser_provider_runs_without_keys():
    async def _run():
        providers = [ParserEvalProvider()]
        scores = await run_fixture_eval(FIXTURE, providers)
        assert len(scores) == 1
        assert scores[0].provider == "parser"
        assert not scores[0].skipped
        assert scores[0].field_scores.document_type == 1.0

    asyncio.run(_run())


def test_gemini_skips_without_api_key():
    async def _run():
        with patch.dict("os.environ", {}, clear=True):
            provider = GeminiEvalProvider()
            result = await provider.extract("Rechnung")
        assert result.skipped is True
        assert "GEMINI_API_KEY" in (result.skip_reason or "")

    asyncio.run(_run())


def test_mistral_skips_without_api_key():
    async def _run():
        with patch.dict("os.environ", {}, clear=True):
            provider = MistralEvalProvider()
            result = await provider.extract("Rechnung")
        assert result.skipped is True
        assert "MISTRAL_API_KEY" in (result.skip_reason or "")

    asyncio.run(_run())


def test_mistral_extract_parses_mock_response():
    async def _run():
        mock_body = {
            "choices": [
                {
                    "message": {
                        "content": '{"titel": "Rechnung", "typ": "Rechnung", "betrag": 10.0}',
                    }
                }
            ],
            "usage": {"prompt_tokens": 100, "completion_tokens": 50},
        }

        class MockResponse:
            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict:
                return mock_body

        class MockClient:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return None

            async def post(self, *args, **kwargs):
                return MockResponse()

        with patch.dict("os.environ", {"MISTRAL_API_KEY": "test-key"}, clear=True):
            with patch("app.services.mistral_eval.httpx.AsyncClient", return_value=MockClient()):
                provider = MistralEvalProvider()
                result = await provider.extract(FIXTURE["raw_text"])

        assert not result.skipped
        assert result.valid_json is True
        assert result.extracted.get("typ") == "Rechnung"

    asyncio.run(_run())


def test_anthropic_skips_without_api_key():
    async def _run():
        with patch("app.services.eval_extraction_providers.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            with patch.dict("os.environ", {}, clear=True):
                provider = AnthropicEvalProvider()
                result = await provider.extract("Rechnung")
        assert result.skipped is True
        assert "ANTHROPIC_API_KEY" in (result.skip_reason or "")

    asyncio.run(_run())


def test_parse_explain_json_fenced_reused_for_eval():
    raw = 'Here is the result:\n```json\n{"titel": "Test", "typ": "Rechnung"}\n```\nDone.'
    data = parse_explain_json(raw)
    assert data["titel"] == "Test"
    assert data["typ"] == "Rechnung"


def test_parse_explain_json_prose_wrapped():
    raw = 'Analysis complete. {"titel": "Mahnung", "typ": "Mahnung", "risiko": "hoch"} — end.'
    data = parse_explain_json(raw)
    assert data["typ"] == "Mahnung"


def test_parse_explain_json_empty_raises():
    with pytest.raises(ExplainJsonParseError):
        parse_explain_json("   ")


def _run_eval_script(*extra_args: str) -> subprocess.CompletedProcess[str]:
    backend_root = Path(__file__).resolve().parents[1]
    script = backend_root / "scripts" / "eval_extraction_providers.py"
    return subprocess.run(
        [sys.executable, str(script), "--providers", "parser", *extra_args],
        cwd=backend_root,
        capture_output=True,
        text=True,
        check=False,
    )


def test_default_eval_output_omits_details_sections():
    result = _run_eval_script()
    assert result.returncode == 0, result.stderr
    assert "=== Summary ===" in result.stdout
    assert "Field Failure Counts:" not in result.stdout
    assert "Total Score:" not in result.stdout


def test_details_eval_output_includes_field_diagnostics():
    result = _run_eval_script("--details")
    assert result.returncode == 0, result.stderr
    assert "Total Score:" in result.stdout
    assert "Field Failure Counts:" in result.stdout
    assert "summary_keywords: matched:" in result.stdout
    assert "| PASS" in result.stdout or "| FAIL" in result.stdout
