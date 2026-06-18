"""Unit tests for rule-based local_document_parser (no external APIs)."""
import json
from pathlib import Path

from app.services.local_document_parser import _parse_german_amount, parse_local_document

_FIXTURES = Path(__file__).resolve().parents[0] / "fixtures" / "extraction_eval"

HEIZOEL_TEXT = """Gebr. Alt GmbH
Pickardstr. 31
66822 Lebach

Rechnung Nr. 2026-4711
Rechnungsdatum: 17.06.2026

Lieferung Heizöl EL 1.500 Liter

Gesamtbetrag 1.929,20 EUR

Zahlung bis 15.07.2026 auf folgendes Konto:
IBAN DE12 3456 7890 1234 5678 90"""


def test_local_parser_detects_rechnung_type():
    result = parse_local_document(HEIZOEL_TEXT)
    assert result.typ == "Rechnung"
    assert result.confidence >= 0.5


def test_local_parser_extracts_amount_date_sender():
    result = parse_local_document(HEIZOEL_TEXT)
    assert result.betrag == 1929.2
    assert result.frist == "2026-07-15"
    assert result.absender is not None
    assert "Alt GmbH" in result.absender
    assert result.dokument_datum == "2026-06-17"
    assert result.iban is not None
    assert result.iban.startswith("DE")


def test_local_parser_mahnung_risk():
    text = (
        "Vodafone GmbH\nMahnung / Zahlungserinnerung\n"
        "Offener Betrag: 45,99 EUR\nFällig am 10.05.2026"
    )
    result = parse_local_document(text)
    assert result.typ == "Mahnung"
    assert result.betrag == 45.99
    assert result.frist == "2026-05-10"
    assert result.risiko == "hoch"
    assert "zahlen" in result.aktionen


def test_local_parser_empty_text_low_confidence():
    result = parse_local_document("")
    assert result.confidence == 0.0


def test_parse_german_amount_thousands_comma_decimal():
    assert _parse_german_amount("1.929,20") == 1929.2
    assert _parse_german_amount("1.222,84") == 1222.84
    assert _parse_german_amount("1.260,36") == 1260.36
    assert _parse_german_amount("45,00") == 45.0


def test_gesamtbetrag_beats_netto_mwst_lines():
    text = """Rechnung
Netto 1.611,38 EUR
MwSt. 19% 306,16 EUR
Gesamtbetrag 1.929,20 EUR"""
    assert parse_local_document(text).betrag == 1929.2


def test_schornstein_brutto_beats_netto():
    text = """Rechnung
Nettosumme EUR 34,98
MwSt.19% EUR 6,65
Summe wiederkehrende Tatigkeiten EUR 41,63"""
    assert parse_local_document(text).betrag == 41.63


def test_vodafone_gutschrift_amount_selected():
    text = """Rechnung
Rechnungsbetrag (brutto, inkl. MwSt)
-93,0100 €
Ihre Gutschrift
-93,01 €"""
    assert parse_local_document(text).betrag == 93.01


def test_wasser_summe_brutto_beats_netto_and_abschlag_summe():
    text = """Jahresverbrauchsabrechnung
Netto MwSt. Brutto
Wasser 535,92 7 37,52 573,44
Summe:
1.222,84
37,52
1.260,36
Fur das kommende Abrechnungsjahr Abschlagsbetrage ermittelt.
Summe
328,00"""
    assert parse_local_document(text).betrag == 1260.36


def test_heizoel_ocr_glued_gesamtt_amount():
    text = """RECHNUNG
GGVS Pauschale 9,80 EUR
Zahlbar:
Gesamtt.1929.20R
sofort"""
    assert parse_local_document(text).betrag == 1929.2


def test_real_fixture_amounts_when_available():
  # Regression guard using redacted OCR fixtures (amount field only).
    for fixture_id, expected in (
        ("schornstein_real", 41.63),
        ("vodafone_real", 93.01),
        ("wasser_real", 1260.36),
    ):
        data = json.loads((_FIXTURES / f"{fixture_id}.json").read_text(encoding="utf-8"))
        assert parse_local_document(data["raw_text"]).betrag == expected
