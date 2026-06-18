"""Tests for extraction fixture redaction (no external APIs)."""
from app.services.extraction_fixture_redaction import redact_extraction_fixture_text


def test_redact_removes_iban_and_street():
    raw = "Herrn Max Mustermann\nZerrstr. 26\n66839 Schmelz\nIBAN: DE12 3456 7890 1234 5678 90"
    out = redact_extraction_fixture_text(raw)
    assert "Zerrstr" not in out
    assert "DE12 3456" not in out
    assert "Musterstr" in out or "[NAME]" in out


def test_redact_ocr_street_variants_and_tax_ids():
    raw = (
        "Liegenschaft:Zerrstrae 30 66839 Schmelz\n"
        "Steuernummer: 010/28200206\n"
        "USt.-Ident NrDE257989441\n"
        "PickardstraBe 31\n"
        "Frau Bambach-Kramer\n"
        "wasserwerk@schmelz.de"
    )
    out = redact_extraction_fixture_text(raw)
    assert "Zerrstr" not in out.lower()
    assert "Zerrstrae" not in out
    assert "010/28200206" not in out
    assert "DE257989441" not in out
    assert "Pickardstra" not in out
    assert "Bambach" not in out
    assert "schmelz.de" not in out


def test_redact_vodafone_footer_names_and_ust():
    raw = (
        "Geschäftsführer\nMarcel de Groot   Carmen Velthuis\n"
        "USt-IdNr.   DE 813 702 351"
    )
    out = redact_extraction_fixture_text(raw)
    assert "Marcel" not in out
    assert "Carmen" not in out
    assert "813 702 351" not in out


def test_redact_preserves_company_names():
    raw = "Gemeindewasserwerk Schmelz\nGebr. Alt GmbH\nVodafone Deutschland GmbH\nRechnungsbetrag\n1.260,36 EUR"
    out = redact_extraction_fixture_text(raw)
    assert "Gemeindewasserwerk" in out
    assert "Gebr. Alt GmbH" in out
    assert "Vodafone" in out
    assert "1.260,36" in out
