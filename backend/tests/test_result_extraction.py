"""Unit tests for deterministic invoice-field fallback extraction."""
import json
from pathlib import Path

from app.services.result_extraction import (
    extract_invoice_fields,
    _extract_sender,
    _extract_date,
    _extract_invoice_number,
)

_FIXTURES = Path(__file__).resolve().parents[0] / "fixtures" / "extraction_eval"


def test_vodafone_extracts_all_fields():
    data = json.loads((_FIXTURES / "vodafone_real.json").read_text(encoding="utf-8"))
    raw = data["raw_text"]
    result = extract_invoice_fields(raw)
    assert "Vodafone" in result["sender"]
    assert result["date"] == "2024-07-09"
    assert result["rechnungsnr"] == "100000000000"


def test_extract_sender_finanzamt():
    assert _extract_sender("Kostenbescheid Finanzamt München") == "Finanzamt"


def test_extract_sender_legal_suffix():
    assert _extract_sender("Muster GmbH\nRechnung") == "Muster GmbH"


def test_extract_sender_none_when_no_match():
    assert _extract_sender("Rechnung Nr. 123") is None


def test_extract_date_numeric_same_line():
    assert _extract_date("Rechnungsdatum: 01.03.2026") == "2026-03-01"


def test_extract_date_german_text_same_line():
    assert _extract_date("Rechnungsdatum: 9. Juli 2024") == "2024-07-09"


def test_extract_date_datum_next_line():
    assert _extract_date("Datum\n9. Juli 2024") == "2024-07-09"


def test_extract_date_none_when_no_match():
    assert _extract_date("Kein Datum vorhanden") is None


def test_extract_invoice_number():
    assert _extract_invoice_number("Rechnungsnummer 100000000000") == "100000000000"


def test_extract_invoice_number_none_when_no_match():
    assert _extract_invoice_number("Keine Nummer") is None


def test_extract_invoice_fields_empty():
    assert extract_invoice_fields(None) == {"sender": None, "date": None, "rechnungsnr": None}
    assert extract_invoice_fields("") == {"sender": None, "date": None, "rechnungsnr": None}
