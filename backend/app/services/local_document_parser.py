"""
Rule-based German document field extractor — eval baseline only.

Deterministic, no LLM. Used by extraction eval harness; not wired into production workers.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any

_AMOUNT_LINE_RE = re.compile(
    r"(?:gesamtbetrag|endbetrag|rechnungsbetrag|zahlbetrag|betrag|summe|gesamt|zu\s+zahlen|offener\s+betrag|ein\s+betrag\s+von)"
    r"[^\d]{0,20}(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,6}[.,]\d{2})\s*(?:€|eur)?",
    re.IGNORECASE,
)
_DEADLINE_RE = re.compile(
    r"(?:zahlung\s+bis|zahlbar\s+bis|bis\s+zum|f[aä]llig\s+am|f[aä]lligkeit\s*:?)\s*"
    r"(\d{1,2}\.\d{1,2}\.\d{4})",
    re.IGNORECASE,
)
_DATE_FIELD_RE = re.compile(
    r"(?:rechnungsdatum|belegdatum|datum)\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{4})",
    re.IGNORECASE,
)
_IBAN_RE = re.compile(r"\b(DE\d{2}(?:\s?\d{4}){4,5}\s?\d{2,4})\b", re.IGNORECASE)
_COMPANY_LINE_RE = re.compile(
    r"^([A-ZÄÖÜ][\wÄÖÜäöüß.&\- ]{2,60}?\s(?:GmbH|AG|KG|OHG|e\.?K\.?|GbR|UG|SE|mbH))\b",
    re.MULTILINE,
)

_TYPE_RULES: list[tuple[str, re.Pattern[str], float]] = [
    ("Mahnung", re.compile(r"\bmahnung\b", re.I), 0.9),
    ("Rechnung", re.compile(r"\brechnung\b", re.I), 0.85),
    ("Bescheid", re.compile(r"\b(bescheid|kostenbescheid|steuerbescheid)\b", re.I), 0.85),
    ("Termin", re.compile(r"\b(termin|ladung|verhandlung)\b", re.I), 0.75),
    ("Vertrag", re.compile(r"\b(vertrag|kündigung)\b", re.I), 0.75),
    ("Mitteilung", re.compile(r"\b(mitteilung|information)\b", re.I), 0.6),
]


def _parse_german_amount(raw: str) -> float | None:
    cleaned = raw.replace("EUR", "").replace("€", "").replace(" ", "").strip()
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})*,\d{2}", cleaned):
        return float(cleaned.replace(".", "").replace(",", "."))
    if re.fullmatch(r"\d{1,6}[.,]\d{2}", cleaned):
        return float(cleaned.replace(",", "."))
    return None


def _iso_from_de_date(raw: str) -> str | None:
    m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$", raw.strip())
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (1 <= d <= 31 and 1 <= mo <= 12):
        return None
    return f"{y:04d}-{mo:02d}-{d:02d}"


def _first_company_sender(text: str) -> tuple[str | None, str | None]:
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        m = _COMPANY_LINE_RE.search(line)
        if m:
            return m.group(1).strip(), line
    return None, None


def _detect_document_type(text: str) -> tuple[str, float, str | None]:
    best_type = "Sonstiges"
    best_score = 0.35
    evidence: str | None = None
    for label, pattern, weight in _TYPE_RULES:
        m = pattern.search(text)
        if m and weight > best_score:
            best_type = label
            best_score = weight
            evidence = m.group(0)
    return best_type, best_score, evidence


def _extract_amount(text: str) -> tuple[float | None, str | None]:
    m = _AMOUNT_LINE_RE.search(text)
    if m:
        val = _parse_german_amount(m.group(1))
        if val is not None:
            return val, m.group(0).strip()
    return None, None


def _extract_deadline(text: str) -> tuple[str | None, str | None]:
    m = _DEADLINE_RE.search(text)
    if m:
        iso = _iso_from_de_date(m.group(1))
        if iso:
            return iso, m.group(0).strip()
    return None, None


def _extract_document_date(text: str) -> tuple[str | None, str | None]:
    m = _DATE_FIELD_RE.search(text)
    if m:
        iso = _iso_from_de_date(m.group(1))
        if iso:
            return iso, m.group(0).strip()
    return None, None


def _guess_risk(doc_type: str, text: str, deadline_iso: str | None) -> str:
    lower = text.lower()
    if doc_type == "Mahnung" or "mahnung" in lower or "verzug" in lower:
        return "hoch"
    if doc_type in ("Bescheid", "Rechnung") and deadline_iso:
        return "mittel"
    if "dringend" in lower or "sofort" in lower:
        return "hoch"
    return "niedrig"


def _guess_actions(doc_type: str, amount: float | None, deadline: str | None) -> list[str]:
    actions: list[str] = []
    if doc_type in ("Rechnung", "Mahnung") and amount is not None:
        actions.append("zahlen")
    if deadline:
        actions.append("kalender")
    if doc_type == "Bescheid":
        actions.append("antworten")
    if not actions:
        actions.append("dokument")
    return actions


def _build_title(doc_type: str, sender: str | None, amount: float | None) -> str | None:
    parts: list[str] = []
    if doc_type != "Sonstiges":
        parts.append(doc_type)
    if sender:
        parts.append(sender.split()[0] if " " in sender else sender[:40])
    if amount is not None:
        parts.append(f"{amount:,.2f} €".replace(",", "X").replace(".", ",").replace("X", "."))
    return " · ".join(parts) if parts else None


@dataclass
class LocalParseResult:
    titel: str | None = None
    typ: str | None = None
    absender: str | None = None
    betrag: float | None = None
    frist: str | None = None
    dokument_datum: str | None = None
    iban: str | None = None
    risiko: str | None = None
    zusammenfassung: str | None = None
    kurzfassung: str | None = None
    aktionen: list[str] = field(default_factory=list)
    warnung: str | None = None
    confidence: float = 0.0
    evidence: dict[str, Any] = field(default_factory=dict)

    def to_explain_dict(self) -> dict[str, Any]:
        """Map to ExplainResult-compatible keys for eval scoring."""
        return {
            "titel": self.titel,
            "typ": self.typ,
            "absender": self.absender,
            "betrag": self.betrag,
            "frist": self.frist,
            "iban": self.iban,
            "risiko": self.risiko,
            "zusammenfassung": self.zusammenfassung,
            "kurzfassung": self.kurzfassung,
            "aktionen": self.aktionen,
            "warnung": self.warnung,
            "confidence": self.confidence,
            "evidence": self.evidence,
        }


def parse_local_document(raw_text: str) -> LocalParseResult:
    """Extract structured fields from German OCR text using deterministic rules."""
    text = (raw_text or "").strip()
    if not text:
        return LocalParseResult(confidence=0.0, evidence={"empty": True})

    doc_type, type_score, type_evidence = _detect_document_type(text)
    sender, sender_evidence = _first_company_sender(text)
    amount, amount_evidence = _extract_amount(text)
    deadline, deadline_evidence = _extract_deadline(text)
    doc_date, date_evidence = _extract_document_date(text)
    iban_m = _IBAN_RE.search(text)
    iban = iban_m.group(1).replace(" ", "") if iban_m else None

    risiko = _guess_risk(doc_type, text, deadline)
    aktionen = _guess_actions(doc_type, amount, deadline)
    titel = _build_title(doc_type, sender, amount)

    signals = sum(
        1
        for v in (doc_type != "Sonstiges", sender, amount is not None, deadline, doc_date)
        if v
    )
    confidence = min(0.95, round(type_score * 0.45 + signals * 0.11, 2))

    summary_bits = [doc_type]
    if sender:
        summary_bits.append(f"von {sender}")
    if amount is not None:
        summary_bits.append(f"Betrag {amount:.2f} EUR")
    if deadline:
        summary_bits.append(f"Frist {deadline}")
    zusammenfassung = ". ".join(summary_bits) + "." if summary_bits else None
    kurzfassung = summary_bits[0] if summary_bits else None

    warnung = None
    if doc_type == "Mahnung":
        warnung = "Mahnung — bitte Frist beachten."

    return LocalParseResult(
        titel=titel,
        typ=doc_type,
        absender=sender,
        betrag=amount,
        frist=deadline,
        dokument_datum=doc_date,
        iban=iban,
        risiko=risiko,
        zusammenfassung=zusammenfassung,
        kurzfassung=kurzfassung,
        aktionen=aktionen,
        warnung=warnung,
        confidence=confidence,
        evidence={
            "document_type": type_evidence,
            "sender": sender_evidence,
            "amount": amount_evidence,
            "deadline": deadline_evidence,
            "document_date": date_evidence,
            "iban": iban,
        },
    )


def parse_local_document_dict(raw_text: str) -> dict[str, Any]:
    return parse_local_document(raw_text).to_explain_dict()
