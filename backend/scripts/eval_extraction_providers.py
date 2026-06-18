#!/usr/bin/env python3
"""
Compare German OCR extraction quality across parser baseline and optional LLM providers.

Examples:
  python backend/scripts/eval_extraction_providers.py --providers parser
  python backend/scripts/eval_extraction_providers.py --providers parser --details
  python backend/scripts/eval_extraction_providers.py --providers parser,gemini,anthropic

Requires network + API keys only when gemini/anthropic providers are selected.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Allow running as `python backend/scripts/eval_extraction_providers.py` from repo root.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.services.eval_extraction_providers import resolve_providers, run_fixture_eval
from app.services.eval_extraction_scorer import (
    FixtureScore,
    compare_extraction_fields,
    count_field_failures,
    merge_field_failure_counts,
)


def _default_fixture_dir() -> Path:
    return _BACKEND_ROOT / "tests" / "fixtures" / "extraction_eval"


def load_fixtures(path: Path) -> list[dict]:
    fixtures: list[dict] = []
    for fp in sorted(path.glob("*.json")):
        data = json.loads(fp.read_text(encoding="utf-8"))
        if "id" not in data or "raw_text" not in data:
            raise ValueError(f"Fixture {fp} must include id and raw_text")
        fixtures.append(data)
    if not fixtures:
        raise SystemExit(f"No fixtures found in {path}")
    return fixtures


def _print_score(score: FixtureScore) -> None:
    if score.skipped:
        print(f"  [{score.provider}] SKIPPED — {score.skip_reason}")
        return
    fs = score.field_scores
    print(
        f"  [{score.provider}] avg={fs.average:.2f} "
        f"type={fs.document_type:.1f} amt={fs.amount:.1f} "
        f"deadline={fs.deadline:.1f} title={fs.title:.1f} "
        f"sender={fs.sender:.1f} risk={fs.risk:.1f} "
        f"summary={fs.summary:.1f} next={fs.next_action:.1f} "
        f"valid_json={score.valid_json} latency_ms={score.latency_ms} cost={score.estimated_cost}"
    )
    if score.extracted:
        preview = {k: score.extracted.get(k) for k in ("titel", "typ", "betrag", "frist", "risiko", "confidence")}
        print(f"    extracted: {json.dumps(preview, ensure_ascii=False)}")


def _print_details(fixture: dict, score: FixtureScore) -> None:
    fixture_id = fixture["id"]
    if score.skipped:
        print(f"  [{fixture_id}] ({score.provider}) - SKIPPED: {score.skip_reason}")
        return

    rows = compare_extraction_fields(score.extracted, fixture.get("expected") or {})
    print(
        f"  [{fixture_id}] ({score.provider}) - Total Score: {score.field_scores.average:.3f}"
    )
    for row in rows:
        if row.name == "summary_keywords":
            if row.expected == "null":
                continue
            note = row.note or "matched: [], missing: []"
            print(f"    - summary_keywords: {note}")
            continue
        if row.name == "next_action" and row.expected == "null":
            continue
        status = "PASS" if row.passed else "FAIL"
        print(
            f"    - {row.name}: expected '{row.expected}', got '{row.actual}' "
            f"| {status} (Score: {row.score:.2f})"
        )


def _print_failure_summary(all_failure_counts: list[dict[str, int]]) -> None:
    merged = merge_field_failure_counts(all_failure_counts)
    print("\nField Failure Counts:")
    if not merged:
        print("  (none)")
        return

    order = [
        "title",
        "document_type",
        "sender",
        "amount",
        "deadline",
        "risk",
        "summary_keywords",
        "next_action",
    ]
    for field in order:
        if field in merged:
            print(f"  - {field}: {merged[field]}")
    for field, n in sorted(merged.items()):
        if field not in order:
            print(f"  - {field}: {n}")


def _summary_table(all_scores: list[FixtureScore]) -> None:
    by_provider: dict[str, list[FixtureScore]] = {}
    for s in all_scores:
        by_provider.setdefault(s.provider, []).append(s)

    print("\n=== Summary ===")
    print(f"{'provider':<12} {'fixtures':>8} {'avg_score':>10} {'valid_json':>10} {'avg_ms':>8}")
    for provider, scores in sorted(by_provider.items()):
        active = [s for s in scores if not s.skipped]
        if not active:
            print(f"{provider:<12} {len(scores):>8} {'SKIPPED':>10} {'-':>10} {'-':>8}")
            continue
        avg = sum(s.field_scores.average for s in active) / len(active)
        valid = sum(1 for s in active if s.valid_json) / len(active)
        latencies = [s.latency_ms for s in active if s.latency_ms is not None]
        avg_ms = sum(latencies) / len(latencies) if latencies else 0.0
        print(
            f"{provider:<12} {len(active):>8} {avg:>10.3f} {valid:>10.2f} {avg_ms:>8.1f}"
        )


async def _run(args: argparse.Namespace) -> int:
    fixture_dir = Path(args.fixtures)
    provider_names = [p.strip() for p in args.providers.split(",") if p.strip()]
    fixtures = load_fixtures(fixture_dir)
    providers = resolve_providers(provider_names)

    print(f"Fixtures: {len(fixtures)} from {fixture_dir}")
    print(f"Providers: {', '.join(provider_names)}\n")

    all_scores: list[FixtureScore] = []
    all_failure_counts: list[dict[str, int]] = []
    for fixture in fixtures:
        print(f"— {fixture['id']} ({fixture.get('label', '')})")
        scores = await run_fixture_eval(fixture, providers)
        for score in scores:
            score.fixture_id = fixture["id"]
            _print_score(score)
            if args.details:
                _print_details(fixture, score)
                if not score.skipped:
                    rows = compare_extraction_fields(score.extracted, fixture.get("expected") or {})
                    all_failure_counts.append(count_field_failures(rows))
        all_scores.extend(scores)
        print()

    _summary_table(all_scores)
    if args.details:
        _print_failure_summary(all_failure_counts)

    if args.json_out:
        out = [
            {
                "fixture_id": s.fixture_id,
                "provider": s.provider,
                "average": s.field_scores.average,
                "field_scores": s.field_scores.__dict__,
                "valid_json": s.valid_json,
                "latency_ms": s.latency_ms,
                "estimated_cost": s.estimated_cost,
                "skipped": s.skipped,
                "skip_reason": s.skip_reason,
                "extracted": s.extracted,
            }
            for s in all_scores
        ]
        Path(args.json_out).write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nWrote JSON results to {args.json_out}")

    skipped_all = all(s.skipped for s in all_scores)
    return 1 if skipped_all and len(provider_names) == 1 else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="German OCR extraction provider eval harness")
    parser.add_argument(
        "--fixtures",
        default=str(_default_fixture_dir()),
        help="Directory with *.json extraction eval fixtures",
    )
    parser.add_argument(
        "--providers",
        default="parser",
        help="Comma-separated providers: parser,gemini,anthropic",
    )
    parser.add_argument("--json-out", default="", help="Optional path to write full JSON results")
    parser.add_argument(
        "--details",
        action="store_true",
        help="Print per-fixture field-level expected vs actual diagnostic report",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args)))


if __name__ == "__main__":
    main()
