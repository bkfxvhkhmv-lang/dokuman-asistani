"""Unit tests for rule-based local_document_parser (no external APIs)."""
from app.services.local_document_parser import parse_local_document

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
