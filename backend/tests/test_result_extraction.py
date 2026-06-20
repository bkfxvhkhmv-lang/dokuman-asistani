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


def test_kundennummer_not_confused_with_rechnungsnr():
    raw = "Kundennummer 12345\nRechnungsnummer ABC-987"
    result = extract_invoice_fields(raw)
    assert result["rechnungsnr"] == "ABC-987"
    assert result["rechnungsnr"] != "12345"


def test_extract_invoice_fields_empty():
    assert extract_invoice_fields(None) == {"sender": None, "date": None, "rechnungsnr": None}
    assert extract_invoice_fields("") == {"sender": None, "date": None, "rechnungsnr": None}


# --- New tests: §6C-QA regression ---

def test_sender_legal_suffix_with_dash_address():
    """Gebr.Alt GmbH-Pickardstr.31 → Gebr.Alt GmbH (Heizöl case)."""
    raw = "Baustoffe\nBrennstoff\n.\nIndustriebedarf\n... Werkzeuge\nGebr.Alt GmbH-Pickardstr.31-66822 Lebach\nHerrn"
    result = _extract_sender(raw)
    assert result is not None
    assert "GmbH" in result
    assert "Pickardstr" not in result


def test_sender_business_keyword_header():
    """HMH Elektro → sender HMH Elektro (Elektro case)."""
    raw = "HMH Elektro\nSeite 1 von 1\nHMH Elektro\nIm Weiherchen 6\n66822 Lebach"
    result = _extract_sender(raw)
    assert result == "HMH Elektro"


def test_sender_no_false_positive_from_address_only():
    """Pure address line should not become sender."""
    raw = "Im Weiherchen 6\n66822 Lebach\nDeutschland"
    assert _extract_sender(raw) is None


def test_sender_no_false_positive_from_recipient():
    """Recipient name (after 'Herrn') should not become sender."""
    raw = "Herrn\nFurkan Ali Gül\nZerrstr. 13\n66839 Schmelz"
    assert _extract_sender(raw) is None


def test_rechnungsnr_rech_nr_label():
    """Rech.-Nr.: → recognized label (Schornstein case)."""
    raw = "Datum:\n25.02.2023\nRech.-Nr.:\n208.000/23/00162"
    result = _extract_invoice_number(raw)
    assert result == "208.000/23/00162"


def test_rechnungsnr_beleg_nr_label():
    """Beleg-Nr.: → recognized label (Heizöl case)."""
    raw = "Datum:\n14.11.2023\nBeleg-Nr.:\n373872"
    result = _extract_invoice_number(raw)
    assert result == "373872"


def test_rechnungsnr_rechnung_nr_inline():
    """Rechnung Nr. RE-20220289 → RE-20220289 (Elektro case)."""
    raw = "Rechnung Nr. RE-20220289\nSehr geehrte Damen und Herren"
    result = _extract_invoice_number(raw)
    assert result == "RE-20220289"


def test_rechnungsnr_no_false_positive_auf():
    """'Rechnungsnummer auf das Konto' must not return 'auf'."""
    raw = "Bitte überweisen Sie unter Angabe der Rechnungsnummer auf das Konto."
    result = _extract_invoice_number(raw)
    assert result != "auf"
    assert result is None


def test_rechnungsnr_two_line_rechnungs_nr():
    """Rechnungs-Nr. on one line, value on next (Elektro second occurrence)."""
    raw = "Rechnungs-Nr.\nRE-20220289\nRechnungsdatum\n07.10.2024"
    result = _extract_invoice_number(raw)
    assert result == "RE-20220289"


def test_rechnungsnr_vodafone_still_correct():
    """Regression: Vodafone invoice number should still be found."""
    raw = "Rechnungsnummer 101064679243\nDatum 9. Juli 2024"
    assert _extract_invoice_number(raw) == "101064679243"


def test_rechnungsnr_wasser_still_correct():
    """Regression: Wasser R-format invoice number."""
    raw = "Rechnungsnummer R000078986\nDatum 07.02.2023"
    assert _extract_invoice_number(raw) == "R000078986"
