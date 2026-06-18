"""Unit tests for eval_extraction_scorer (no external APIs)."""
import pytest

from app.services.eval_extraction_scorer import (
    FieldScores,
    FixtureScore,
    aggregate_field_averages,
    compare_extraction_fields,
    count_field_failures,
    merge_field_failure_counts,
    score_amount,
    score_deadline,
    score_document_type,
    score_extraction,
    score_keywords,
)


def test_compare_extraction_fields_reports_mismatches():
    rows = compare_extraction_fields(
        {"typ": "Sonstiges", "betrag": 1929.2, "frist": None, "absender": None, "risiko": "mittel"},
        {
            "document_type": "Rechnung",
            "amount": -103.64,
            "deadline": "2026-03-01",
            "sender_keywords": ["Gemeindewasserwerk"],
            "risk": "niedrig",
        },
    )
    by_name = {row.name: row for row in rows}
    assert by_name["document_type"].passed is False
    assert by_name["document_type"].expected == "Rechnung"
    assert by_name["document_type"].actual == "Sonstiges"
    assert by_name["amount"].passed is False
    assert by_name["deadline"].passed is False
    assert by_name["sender"].passed is False


def test_count_field_failures_skips_null_expected():
    rows = compare_extraction_fields(
        {"typ": "Rechnung", "betrag": 10.0, "frist": None},
        {"document_type": "Rechnung", "amount": 10.0, "deadline": None},
    )
    counts = count_field_failures(rows)
    assert counts == {}


def test_merge_field_failure_counts():
    merged = merge_field_failure_counts(
        [{"amount": 2, "deadline": 1}, {"amount": 1, "sender": 1}]
    )
    assert merged == {"amount": 3, "deadline": 1, "sender": 1}


def test_summary_keywords_reports_matched_missing():
    rows = compare_extraction_fields(
        {"zusammenfassung": "Rechnung von Alt"},
        {"summary_keywords": ["Heizöl", "Rechnung", "Alt"]},
    )
    by_name = {row.name: row for row in rows}
    assert by_name["summary_keywords"].passed is False
    assert by_name["summary_keywords"].score == pytest.approx(2 / 3)
    assert "matched: ['Rechnung', 'Alt']" in (by_name["summary_keywords"].note or "")
    assert "missing: ['Heizöl']" in (by_name["summary_keywords"].note or "")


def test_aggregate_field_averages():
    scores = [
        FixtureScore(
            "a",
            "parser",
            FieldScores(document_type=1.0, amount=0.0, title=0.5),
        ),
        FixtureScore(
            "b",
            "parser",
            FieldScores(document_type=1.0, amount=1.0, title=1.0),
        ),
    ]
    avgs = aggregate_field_averages(scores)
    assert avgs["document_type"] == 1.0
    assert avgs["amount"] == 0.5
    assert avgs["title"] == 0.75


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
