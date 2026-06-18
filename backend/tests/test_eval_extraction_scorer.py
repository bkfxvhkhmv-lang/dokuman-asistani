"""Unit tests for eval_extraction_scorer (no external APIs)."""
from app.services.eval_extraction_scorer import (
    score_amount,
    score_deadline,
    score_document_type,
    score_extraction,
    score_keywords,
)


def test_score_document_type_normalized():
    assert score_document_type("Rechnung", "rechnung") == 1.0
    assert score_document_type("Rechnungen", "Rechnung") == 1.0
    assert score_document_type("Sonstiges", "Rechnung") == 0.0


def test_score_amount_tolerance():
    assert score_amount(1929.2, 1929.2) == 1.0
    assert score_amount(1929.19, 1929.2, tolerance=0.02) == 1.0
    assert score_amount(None, 100.0) == 0.0


def test_score_deadline_iso_and_de():
    assert score_deadline("2026-07-15", "2026-07-15") == 1.0
    assert score_deadline("15.07.2026", "2026-07-15") == 1.0
    assert score_deadline(None, "2026-07-15") == 0.0


def test_score_keywords_partial():
    assert score_keywords("Heizöllieferung Rechnung Juni", ["Heizöl", "Rechnung"]) == 1.0
    assert score_keywords("Rechnung", ["Heizöl", "Rechnung"]) == 0.5


def test_score_extraction_fixture_aggregate():
    score = score_extraction(
        "fx-1",
        "parser",
        {
            "typ": "Rechnung",
            "titel": "Rechnung Alt GmbH",
            "absender": "Gebr. Alt GmbH",
            "betrag": 1929.2,
            "frist": "2026-07-15",
            "risiko": "mittel",
            "zusammenfassung": "Rechnung von Alt GmbH Betrag",
            "aktionen": ["zahlen", "kalender"],
        },
        {
            "document_type": "Rechnung",
            "title_keywords": ["Rechnung"],
            "sender_keywords": ["Alt"],
            "amount": 1929.2,
            "deadline": "2026-07-15",
            "risk": "mittel",
            "summary_keywords": ["Rechnung", "Alt"],
            "next_action": "zahlen",
        },
    )
    assert score.field_scores.average >= 0.9
    assert score.valid_json is True
