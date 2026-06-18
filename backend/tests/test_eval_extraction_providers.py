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
    assert "Field failure counts" not in result.stdout
    assert "Field average scores" not in result.stdout
    assert "details [parser]" not in result.stdout


def test_details_eval_output_includes_field_diagnostics():
    result = _run_eval_script("--details")
    assert result.returncode == 0, result.stderr
    assert "details [parser]" in result.stdout
    assert "=== Field failure counts ===" in result.stdout
    assert "=== Field average scores ===" in result.stdout
    assert "summary_keywords:" in result.stdout
