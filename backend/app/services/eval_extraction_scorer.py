"""
Field-level scoring for extraction eval harness — no external API calls.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

_TYPE_ALIASES: dict[str, set[str]] = {
    "rechnung": {"rechnung", "rechnungen", "invoice"},
    "mahnung": {"mahnung", "mahnungen"},
    "bescheid": {"bescheid", "kostenbescheid", "steuerbescheid", "behörde", "behörden / amt"},
    "termin": {"termin"},
    "vertrag": {"vertrag", "verträge"},
    "mitteilung": {"mitteilung", "sonstiges"},
}


def _norm_type(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.strip().lower())


def score_document_type(actual: str | None, expected: str | None) -> float:
    if not expected:
        return 1.0
    a, e = _norm_type(actual), _norm_type(expected)
    if not a:
        return 0.0
    if a == e:
        return 1.0
    for _canonical, aliases in _TYPE_ALIASES.items():
        if a in aliases and e in aliases:
            return 1.0
    if e in a or a in e:
        return 0.8
    return 0.0


def score_amount(actual: float | None, expected: float | None, tolerance: float = 0.02) -> float:
    if expected is None:
        return 1.0
    if actual is None:
        return 0.0
    if abs(actual - expected) <= tolerance:
        return 1.0
    if expected != 0 and abs(actual - expected) / abs(expected) <= 0.01:
        return 1.0
    return 0.0


def _norm_date(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", v)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$", v)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    return v


def score_deadline(actual: str | None, expected: str | None) -> float:
    if not expected:
        return 1.0
    a, e = _norm_date(actual), _norm_date(expected)
    if not a:
        return 0.0
    return 1.0 if a == e else 0.0


def score_keywords(actual: str | None, keywords: list[str] | None) -> float:
    if not keywords:
        return 1.0
    if not actual:
        return 0.0
    lower = actual.lower()
    hits = sum(1 for kw in keywords if kw.lower() in lower)
    return hits / len(keywords)


def score_exact(actual: str | None, expected: str | None) -> float:
    if not expected:
        return 1.0
    if not actual:
        return 0.0
    return 1.0 if actual.strip().lower() == expected.strip().lower() else 0.0


def score_next_action(actual_actions: list[str] | None, expected: str | None) -> float:
    if not expected:
        return 1.0
    if not actual_actions:
        return 0.0
    first = actual_actions[0].strip().lower()
    return 1.0 if first == expected.strip().lower() else 0.0


@dataclass
class FieldScores:
    document_type: float = 0.0
    amount: float = 0.0
    deadline: float = 0.0
    title: float = 0.0
    sender: float = 0.0
    risk: float = 0.0
    summary: float = 0.0
    next_action: float = 0.0

    @property
    def average(self) -> float:
        vals = [
            self.document_type,
            self.amount,
            self.deadline,
            self.title,
            self.sender,
            self.risk,
            self.summary,
            self.next_action,
        ]
        return round(sum(vals) / len(vals), 3)


@dataclass
class FixtureScore:
    fixture_id: str
    provider: str
    field_scores: FieldScores
    valid_json: bool = True
    skipped: bool = False
    skip_reason: str | None = None
    latency_ms: float | None = None
    estimated_cost: str = "unknown"
    extracted: dict[str, Any] = field(default_factory=dict)


def score_extraction(
    fixture_id: str,
    provider: str,
    extracted: dict[str, Any],
    expected: dict[str, Any],
    *,
    valid_json: bool = True,
    latency_ms: float | None = None,
    estimated_cost: str = "unknown",
    skipped: bool = False,
    skip_reason: str | None = None,
) -> FixtureScore:
    actions = extracted.get("aktionen") or []
    if isinstance(actions, str):
        actions = [actions]

    fields = FieldScores(
        document_type=score_document_type(
            extracted.get("typ") or extracted.get("document_type"),
            expected.get("document_type"),
        ),
        amount=score_amount(extracted.get("betrag") or extracted.get("amount"), expected.get("amount")),
        deadline=score_deadline(
            extracted.get("frist") or extracted.get("deadline"),
            expected.get("deadline"),
        ),
        title=score_keywords(
            extracted.get("titel") or extracted.get("title"),
            expected.get("title_keywords") or ([expected["title"]] if expected.get("title") else None),
        ),
        sender=score_keywords(
            extracted.get("absender") or extracted.get("sender"),
            expected.get("sender_keywords") or ([expected["sender"]] if expected.get("sender") else None),
        ),
        risk=score_exact(extracted.get("risiko") or extracted.get("risk"), expected.get("risk")),
        summary=score_keywords(
            extracted.get("zusammenfassung") or extracted.get("summary"),
            expected.get("summary_keywords"),
        ),
        next_action=score_next_action(actions, expected.get("next_action")),
    )
    return FixtureScore(
        fixture_id=fixture_id,
        provider=provider,
        field_scores=fields,
        valid_json=valid_json,
        skipped=skipped,
        skip_reason=skip_reason,
        latency_ms=latency_ms,
        estimated_cost=estimated_cost,
        extracted=extracted,
    )
