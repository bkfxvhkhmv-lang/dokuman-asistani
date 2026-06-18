#!/usr/bin/env python3
"""
Re-fetch OCR raw_text from fixture source metadata and apply latest redaction.

Preserves id, label, expected from each existing *_real.json fixture.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.services.extraction_fixture_redaction import redact_extraction_fixture_text
from app.services.ocr import run_ocr

FIXTURE_DIR = _BACKEND_ROOT / "tests" / "fixtures" / "extraction_eval"


def _fetch_db_raw(doc_id: str) -> str:
    from sqlalchemy import create_engine, text
    from app.config import get_settings

    settings = get_settings()
    sync_url = settings.database_url.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT roh_text FROM document_texts WHERE doc_id = :id"),
            {"id": doc_id},
        ).fetchone()
    if not row or not row[0]:
        raise SystemExit(f"No raw_text in DB for doc_id={doc_id!r}")
    return row[0]


def _parse_source(source: str) -> tuple[str, str]:
    m = re.match(r"doc_id=([0-9a-f-]+)\s+file=(.+)", source, re.I)
    if m:
        return "db", m.group(1)
    m = re.match(r"pdf=(.+)", source, re.I)
    if m:
        return "pdf", m.group(1).strip()
    raise SystemExit(f"Cannot parse fixture source: {source!r}")


def reredact_fixture(path: Path, pdf_dir: Path | None = None) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    kind, ref = _parse_source(data.get("source", ""))
    if kind == "db":
        raw = _fetch_db_raw(ref)
    else:
        pdf_path = (pdf_dir or Path("/tmp")) / ref
        if not pdf_path.is_file():
            raise SystemExit(f"PDF not found for {path.name}: {pdf_path}")
        raw = run_ocr(pdf_path.read_bytes()).text

    data["raw_text"] = redact_extraction_fixture_text(raw)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {path.name} ({len(data['raw_text'])} chars)")


def main() -> None:
    pdf_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp")
    for path in sorted(FIXTURE_DIR.glob("*_real.json")):
        reredact_fixture(path, pdf_dir=pdf_dir)


if __name__ == "__main__":
    main()
