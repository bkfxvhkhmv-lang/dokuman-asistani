"""
Rule-based German document field extractor — eval baseline only.

Deterministic, no LLM. Used by extraction eval harness; not wired into production workers.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any

_AMOUNT_RE = re.compile(r"-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2,4}")
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

_BANNED_AMOUNT_LABELS = (
    "zwischensumme",
    "netto",
    "mwst",
    "ust",
    "umsatzsteuer",
    "mehrwertsteuer",
    "steuerbetrag",
    "sätze",
    "einzelpreis",
    "stückpreis",
    "verbrauch",
    "abschlag",
    "vorauszahlung",
    "kwh",
    "m3",
    "m³",
)

_PRIORITY_1_LABELS = (
    "gesamtbetrag",
    "rechnungsbetrag",
    "bruttobetrag",
    "endbetrag",
    "gesamt",
)

_PRIORITY_2_LABELS = (
    "zahlbar",
    "zu zahlen",
    "zahlbetrag",
    "zahlungsbetrag",
    "offener betrag",
    "fälliger betrag",
)

_PRIORITY_3_LABELS = (
    "guthaben",
    "gutschrift",
    "erstattung",
    "zu ihren gunsten",
)

_SUMME_LINE_RE = re.compile(r"^\s*summe\s*:?\s*$", re.I)
_AMOUNT_ONLY_LINE_RE = re.compile(r"^\s*-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2,4}\s*(?:€|eur)?\s*$", re.I)
_LABEL_GLUED_AMOUNT_RE = re.compile(
    r"(gesamtbetrag|gesamtt?|rechnungsbetrag|endbetrag|bruttobetrag|zahlbetrag)"
    r"[^\d]{0,3}(\d{1,3}(?:\.\d{3})*|\d+)[.,](\d{2})",
    re.IGNORECASE,
)


@dataclass
class _AmountCandidate:
    amount: float
    line_index: int
    line_text: str
    label_priority: int
    is_banned: bool
    is_credit: bool


def _parse_german_amount(raw: str) -> float | None:
    cleaned = raw.replace("EUR", "").replace("€", "").replace(" ", "").strip()
    negative = cleaned.startswith("-")
    if negative:
        cleaned = cleaned[1:]
    m = re.fullmatch(r"(\d{1,3}(?:\.\d{3})*),(\d{2,4})", cleaned)
    if m:
        whole = m.group(1).replace(".", "")
        cents = m.group(2)[:2]
        val = float(f"{whole}.{cents}")
        return -val if negative else val
    m = re.fullmatch(r"(\d+),(\d{2,4})", cleaned)
    if m:
        val = float(f"{m.group(1)}.{m.group(2)[:2]}")
        return -val if negative else val
    return None


def _line_has_banned_label(line: str) -> bool:
    lower = line.lower()
    return any(label in lower for label in _BANNED_AMOUNT_LABELS)


def _summe_context_is_installment(lines: list[str], summe_line_index: int) -> bool:
    window = lines[max(0, summe_line_index - 25) : summe_line_index]
    combined = "\n".join(window).lower()
    if "abschlag" in combined or "vorauszahlung" in combined:
        return True
    prior_summe_colon = any(
        _SUMME_LINE_RE.match(lines[j]) for j in range(summe_line_index) if j >= 0
    )
    if prior_summe_colon and _SUMME_LINE_RE.match(lines[summe_line_index]):
        return True
    return False


def _context_has_credit_label(*lines: str | None) -> bool:
    context = "\n".join(line or "" for line in lines).lower()
    return any(label in context for label in _PRIORITY_3_LABELS)


def _summe_label_line(line: str) -> bool:
    lower = line.lower()
    if "nettosumme" in lower or "zwischensumme" in lower:
        return False
    return bool(re.search(r"\bsumme\b", lower))


def _label_priority_for_context(*lines: str | None) -> int:
    context = "\n".join(line or "" for line in lines).lower()
    if any(label in context for label in _PRIORITY_1_LABELS):
        return 1
    if any(label in context for label in _PRIORITY_2_LABELS):
        return 2
    if any(label in context for label in _PRIORITY_3_LABELS):
        return 3
    prev_line, line = (lines + (None, None))[:2]
    if _summe_label_line(line or "") or _summe_label_line(prev_line or ""):
        return 1
    return 4


def _collect_summe_block_amount(lines: list[str], start_index: int) -> _AmountCandidate | None:
    """After a bare 'Summe:' line, the last amount-only row is usually Brutto."""
    summe_line_index = start_index - 1
    if _summe_context_is_installment(lines, summe_line_index):
        return None
    amounts: list[tuple[int, float, str]] = []
    for offset, line in enumerate(lines[start_index : start_index + 4]):
        if not _AMOUNT_ONLY_LINE_RE.match(line):
            if amounts:
                break
            continue
        m = _AMOUNT_RE.search(line)
        if not m:
            continue
        val = _parse_german_amount(m.group(0))
        if val is not None:
            amounts.append((start_index + offset, abs(val), line.strip()))
    if not amounts:
        return None
    line_index, amount, line_text = amounts[-1]
    return _AmountCandidate(
        amount=amount,
        line_index=line_index,
        line_text=line_text,
        label_priority=1,
        is_banned=False,
        is_credit=False,
    )


def _extract_amount_candidates(text: str) -> list[_AmountCandidate]:
    lines = [line.rstrip() for line in text.splitlines()]
    candidates: list[_AmountCandidate] = []

    for i, line in enumerate(lines):
        if i > 0 and _SUMME_LINE_RE.match(lines[i - 1]):
            summe_candidate = _collect_summe_block_amount(lines, i)
            if summe_candidate is not None:
                candidates.append(summe_candidate)

        prev_line = lines[i - 1] if i > 0 else None
        next_line = lines[i + 1] if i + 1 < len(lines) else None
        is_banned = _line_has_banned_label(line)
        if prev_line and _SUMME_LINE_RE.match(prev_line) and _summe_context_is_installment(lines, i - 1):
            is_banned = True
        context_lines = (prev_line, line, next_line)
        is_credit_context = _context_has_credit_label(*context_lines)

        for match in _AMOUNT_RE.finditer(line):
            raw = match.group(0)
            parsed = _parse_german_amount(raw)
            if parsed is None:
                continue
            is_credit = parsed < 0 or is_credit_context
            label_priority = _label_priority_for_context(prev_line, line)
            candidates.append(
                _AmountCandidate(
                    amount=abs(parsed),
                    line_index=i,
                    line_text=line.strip(),
                    label_priority=label_priority,
                    is_banned=is_banned,
                    is_credit=is_credit,
                )
            )

        if not _AMOUNT_RE.search(line):
            label_only_priority = _label_priority_for_context(prev_line, line, next_line)
            if label_only_priority < 4 and next_line:
                next_banned = _line_has_banned_label(next_line)
                if _SUMME_LINE_RE.match(line) and _summe_context_is_installment(lines, i):
                    next_banned = True
                for match in _AMOUNT_RE.finditer(next_line):
                    raw = match.group(0)
                    parsed = _parse_german_amount(raw)
                    if parsed is None:
                        continue
                    is_credit = parsed < 0 or _context_has_credit_label(prev_line, line, next_line)
                    candidates.append(
                        _AmountCandidate(
                            amount=abs(parsed),
                            line_index=i + 1,
                            line_text=next_line.strip(),
                            label_priority=label_only_priority,
                            is_banned=next_banned,
                            is_credit=is_credit,
                        )
                    )

    return candidates


def _extract_glued_label_amounts(text: str) -> list[_AmountCandidate]:
    """OCR-glued labels like 'Gesamtt.1929.20R' on one line."""
    lines = [line.rstrip() for line in text.splitlines()]
    candidates: list[_AmountCandidate] = []
    for i, line in enumerate(lines):
        for match in _LABEL_GLUED_AMOUNT_RE.finditer(line):
            whole = match.group(2)
            if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", whole):
                whole = whole.replace(".", "")
            amount = float(f"{whole}.{match.group(3)}")
            candidates.append(
                _AmountCandidate(
                    amount=amount,
                    line_index=i,
                    line_text=line.strip(),
                    label_priority=1,
                    is_banned=_line_has_banned_label(line),
                    is_credit=False,
                )
            )
    return candidates


def _rank_amount_candidates(candidates: list[_AmountCandidate]) -> _AmountCandidate | None:
    if not candidates:
        return None

    viable = [candidate for candidate in candidates if not candidate.is_banned]
    pool = viable or candidates

    # Lower priority number wins; prefer non-credit for ties; later lines for fallback.
    pool.sort(key=lambda c: (c.label_priority, c.is_credit, -c.line_index))
    return pool[0]


def _extract_amount(text: str) -> tuple[float | None, str | None]:
    candidates = _extract_amount_candidates(text)
    candidates.extend(_extract_glued_label_amounts(text))
    candidate = _rank_amount_candidates(candidates)
    if candidate is None:
        return None, None
    return candidate.amount, candidate.line_text


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
