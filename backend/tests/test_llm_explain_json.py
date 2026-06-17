import pytest

from app.services.llm import ExplainJsonParseError, parse_explain_json


def test_parse_plain_json():
    raw = '{"titel": "Rechnung", "typ": "Rechnung", "betrag": 12.5}'
    data = parse_explain_json(raw)
    assert data["titel"] == "Rechnung"
    assert data["betrag"] == 12.5


def test_parse_json_code_fence():
    raw = """Here is the analysis:
```json
{"titel": "Mahnung", "typ": "Mahnung", "risiko": "hoch"}
```
"""
    data = parse_explain_json(raw)
    assert data["titel"] == "Mahnung"
    assert data["risiko"] == "hoch"


def test_parse_json_with_leading_and_trailing_prose():
    raw = (
        "Analyse:\n"
        '{"titel": "Bescheid", "zusammenfassung": "Zahlung fällig", "typ": "Bescheid"}\n'
        "Ende."
    )
    data = parse_explain_json(raw)
    assert data["titel"] == "Bescheid"
    assert data["zusammenfassung"] == "Zahlung fällig"


def test_parse_empty_response_raises():
    with pytest.raises(ExplainJsonParseError, match="empty"):
        parse_explain_json("")
    with pytest.raises(ExplainJsonParseError, match="empty"):
        parse_explain_json("   ")


def test_parse_non_json_raises():
    with pytest.raises(ExplainJsonParseError, match="not valid JSON"):
        parse_explain_json("Dies ist keine JSON-Antwort.")
