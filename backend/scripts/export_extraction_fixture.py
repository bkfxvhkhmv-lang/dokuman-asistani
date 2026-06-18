#!/usr/bin/env python3
"""
Export OCR raw_text from DB doc_id or PDF file into extraction eval fixture JSON.

Usage:
  python scripts/export_extraction_fixture.py \\
    --doc-id 62f00ac9-10de-4faa-bbc8-6854383a8838 \\
    --fixture-id wasser_real \\
    --label "Gemeindewasserwerk Jahresabrechnung (redacted)" \\
    --expected-json '{"document_type":"Rechnung",...}' \\
    --write tests/fixtures/extraction_eval/wasser_real.json

  python scripts/export_extraction_fixture.py \\
    --pdf /tmp/vodafone.pdf \\
    --fixture-id vodafone_real \\
    --label "Vodafone Rechnung (redacted)" \\
    --expected-file expected/vodafone.json \\
    --write tests/fixtures/extraction_eval/vodafone_real.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.services.extraction_fixture_redaction import redact_extraction_fixture_text
from app.services.ocr import run_ocr


def _fetch_raw_text_from_db(doc_id: str) -> tuple[str, str | None]:
    from sqlalchemy import create_engine, text
    from app.config import get_settings

    settings = get_settings()
    sync_url = settings.database_url.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT d.filename, dt.roh_text FROM documents d "
                "JOIN document_texts dt ON dt.doc_id = d.id WHERE d.id = :id"
            ),
            {"id": doc_id},
        ).fetchone()
    if not row or not row[1]:
        raise SystemExit(f"No raw_text for doc_id={doc_id!r}")
    return row[1], row[0]


def _load_expected(args: argparse.Namespace) -> dict:
    if args.expected_json:
        return json.loads(args.expected_json)
    if args.expected_file:
        return json.loads(Path(args.expected_file).read_text(encoding="utf-8"))
    return {}


def main() -> None:
    parser = argparse.ArgumentParser(description="Export redacted extraction eval fixture")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--doc-id", help="Existing document UUID with document_texts.roh_text")
    src.add_argument("--pdf", help="PDF path to OCR via run_ocr (same Paddle path as worker)")
    parser.add_argument("--fixture-id", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--expected-json", default="", help="JSON object for expected fields")
    parser.add_argument("--expected-file", default="", help="Path to expected JSON file")
    parser.add_argument("--no-redact", action="store_true", help="Skip PII redaction (local only)")
    parser.add_argument("--write", required=True, help="Output fixture JSON path")
    args = parser.parse_args()

    source_note = ""
    if args.doc_id:
        raw_text, filename = _fetch_raw_text_from_db(args.doc_id)
        source_note = f"doc_id={args.doc_id} file={filename}"
    else:
        pdf_path = Path(args.pdf)
        raw_text = run_ocr(pdf_path.read_bytes()).text
        source_note = f"pdf={pdf_path.name}"

    text = raw_text if args.no_redact else redact_extraction_fixture_text(raw_text)
    fixture = {
        "id": args.fixture_id,
        "label": args.label,
        "source": source_note,
        "raw_text": text,
        "expected": _load_expected(args),
    }

    out = Path(args.write)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(text)} chars, redacted={not args.no_redact})")


if __name__ == "__main__":
    main()
