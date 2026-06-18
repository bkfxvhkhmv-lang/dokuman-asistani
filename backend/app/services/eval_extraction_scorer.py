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
class FieldDetail:
    """Expected vs actual for one scored extraction field."""

    name: str
    expected: str
    actual: str
    score: float
    passed: bool
    note: str | None = None


def _fmt(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, float):
        return f"{value:g}"
    if isinstance(value, list):
        return ", ".join(str(v) for v in value) if value else "null"
    return str(value)


def compare_extraction_fields(
    extracted: dict[str, Any],
    expected: dict[str, Any],
) -> list[FieldDetail]:
    """Build field-level expected/actual rows for diagnostic eval output."""
    actions = extracted.get("aktionen") or []
    if isinstance(actions, str):
        actions = [actions]

    actual_type = extracted.get("typ") or extracted.get("document_type")
    actual_amount = extracted.get("betrag") if "betrag" in extracted else extracted.get("amount")
    actual_deadline = extracted.get("frist") or extracted.get("deadline")
    actual_title = extracted.get("titel") or extracted.get("title")
    actual_sender = extracted.get("absender") or extracted.get("sender")
    actual_risk = extracted.get("risiko") or extracted.get("risk")
    actual_summary = extracted.get("zusammenfassung") or extracted.get("summary")
    actual_next = actions[0] if actions else None

    title_keywords = expected.get("title_keywords") or (
        [expected["title"]] if expected.get("title") else None
    )
    sender_keywords = expected.get("sender_keywords") or (
        [expected["sender"]] if expected.get("sender") else None
    )
    summary_keywords = expected.get("summary_keywords")

    type_score = score_document_type(actual_type, expected.get("document_type"))
    amount_score = score_amount(actual_amount, expected.get("amount"))
    deadline_score = score_deadline(actual_deadline, expected.get("deadline"))
    title_score = score_keywords(actual_title, title_keywords)
    sender_score = score_keywords(actual_sender, sender_keywords)
    risk_score = score_exact(actual_risk, expected.get("risk"))
    summary_score = score_keywords(actual_summary, summary_keywords)
    next_score = score_next_action(actions, expected.get("next_action"))

    summary_note = None
    if summary_keywords:
        lower = (actual_summary or "").lower()
        matched = [kw for kw in summary_keywords if kw.lower() in lower]
        missing = [kw for kw in summary_keywords if kw.lower() not in lower]
        summary_note = f"matched: {matched or ['—']}, missing: {missing or ['—']}"

    title_note = None
    if title_keywords:
        lower = (actual_title or "").lower()
        matched = [kw for kw in title_keywords if kw.lower() in lower]
        missing = [kw for kw in title_keywords if kw.lower() not in lower]
        title_note = f"keywords matched={matched or ['—']}, missing={missing or ['—']}"

    sender_note = None
    if sender_keywords:
        lower = (actual_sender or "").lower()
        matched = [kw for kw in sender_keywords if kw.lower() in lower]
        missing = [kw for kw in sender_keywords if kw.lower() not in lower]
        sender_note = f"keywords matched={matched or ['—']}, missing={missing or ['—']}"

    rows: list[FieldDetail] = [
        FieldDetail(
            "title",
            _fmt(title_keywords),
            _fmt(actual_title),
            title_score,
            title_score >= 1.0,
            title_note,
        ),
        FieldDetail(
            "document_type",
            _fmt(expected.get("document_type")),
            _fmt(actual_type),
            type_score,
            type_score >= 1.0,
        ),
        FieldDetail(
            "sender",
            _fmt(sender_keywords),
            _fmt(actual_sender),
            sender_score,
            sender_score >= 1.0,
            sender_note,
        ),
        FieldDetail(
            "amount",
            _fmt(expected.get("amount")),
            _fmt(actual_amount),
            amount_score,
            amount_score >= 1.0,
        ),
        FieldDetail(
            "deadline",
            _fmt(expected.get("deadline")),
            _fmt(actual_deadline),
            deadline_score,
            deadline_score >= 1.0,
        ),
        FieldDetail(
            "risk",
            _fmt(expected.get("risk")),
            _fmt(actual_risk),
            risk_score,
            risk_score >= 1.0,
        ),
        FieldDetail(
            "summary_keywords",
            _fmt(summary_keywords),
            _fmt(actual_summary),
            summary_score,
            summary_score >= 1.0,
            summary_note,
        ),
        FieldDetail(
            "next_action",
            _fmt(expected.get("next_action")),
            _fmt(actual_next),
            next_score,
            next_score >= 1.0,
        ),
    ]
    return rows


def count_field_failures(details: list[FieldDetail]) -> dict[str, int]:
    """Count fields with an expectation that did not fully pass."""
    counts: dict[str, int] = {}
    for row in details:
        if row.expected == "null":
            continue
        if not row.passed:
            counts[row.name] = counts.get(row.name, 0) + 1
    return counts


def merge_field_failure_counts(counts_list: list[dict[str, int]]) -> dict[str, int]:
    merged: dict[str, int] = {}
    for counts in counts_list:
        for field, n in counts.items():
            merged[field] = merged.get(field, 0) + n
    return merged


_FIELD_AVERAGE_ATTRS: dict[str, str] = {
    "title": "title",
    "document_type": "document_type",
    "sender": "sender",
    "amount": "amount",
    "deadline": "deadline",
    "risk": "risk",
    "summary_keywords": "summary",
    "next_action": "next_action",
}


def aggregate_field_averages(scores: list[FixtureScore]) -> dict[str, float]:
    """Mean per-field scores across non-skipped fixture results."""
    active = [s for s in scores if not s.skipped]
    if not active:
        return {}
    out: dict[str, float] = {}
    for display_name, attr in _FIELD_AVERAGE_ATTRS.items():
        vals = [getattr(s.field_scores, attr) for s in active]
        out[display_name] = round(sum(vals) / len(vals), 2)
    return out


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
