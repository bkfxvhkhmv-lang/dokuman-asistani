"""Deterministic fallback extraction for invoice fields from raw OCR text.

Used when AI worker result fields (sender, date, rechnungsnr) are empty.
Pure regex — no ML, no DB, no side effects.
"""

import re
from typing import Optional

_GERMAN_MONTH: dict[str, int] = {
    "januar": 1, "februar": 2, "märz": 3, "april": 4, "mai": 5, "juni": 6,
    "juli": 7, "august": 8, "september": 9, "oktober": 10, "november": 11, "dezember": 12,
    "jan": 1, "feb": 2, "mär": 3, "apr": 4, "jun": 6, "jul": 7,
    "aug": 8, "sep": 9, "okt": 10, "nov": 11, "dez": 12,
}

_MONTH_PAT = "|".join(_GERMAN_MONTH)

_SAME_LINE_DATE_RE = re.compile(
    r"(?:rechnungsdatum|belegdatum|datum)\s*:?\s*"
    r"(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{2,4})",
    re.IGNORECASE,
)

_SAME_LINE_DE_DATE_RE = re.compile(
    rf"(?:rechnungsdatum|belegdatum|datum)\s*:?\s*"
    rf"(\d{{1,2}})\.\s*({_MONTH_PAT})\s*(\d{{4}})",
    re.IGNORECASE,
)

_DATE_LABEL_ONLY_RE = re.compile(
    r"(?:rechnungsdatum|belegdatum|datum)\s*:?\s*",
    re.IGNORECASE,
)

_INVOICE_NR_RE = re.compile(
    r"(?:rechnungsnummer|rechnungs-nr|rechnungsnr)\s*:?\s*([\w\d/\-]+)",
    re.IGNORECASE,
)

_LEGAL_SUFFIX_RE = re.compile(
    r"((?:Gebr\.\s*)?[\wÄÖÜäöüß.&\-]{1,50}?\s+"
    r"(?:GmbH(?:\s*&\s*Co\.\s*KG)?|Deutschland\s+GmbH|AG|KG|OHG|e\.?G\.?|GbR|UG|SE)\b)",
    re.IGNORECASE,
)

_BRAND_RE = re.compile(
    r"\b(vodafone|telekom|o2|unitymedia|stadtwerke|gemeindewasserwerk|wasserwerk|finanzamt)\b",
    re.IGNORECASE,
)

_BRAND_CANONICAL: dict[str, str | None] = {
    "vodafone": "Vodafone",
    "telekom": "Telekom",
    "o2": "o2",
    "unitymedia": "Unitymedia",
    "stadtwerke": None,
    "gemeindewasserwerk": "Gemeindewasserwerk",
    "wasserwerk": None,
    "finanzamt": None,
}


def _iso_date(d: int, mo: int, y: int) -> str | None:
    if y < 100:
        y = 2000 + y if y <= 79 else 1900 + y
    if not (1 <= d <= 31 and 1 <= mo <= 12):
        return None
    return f"{y:04d}-{mo:02d}-{d:02d}"


def _extract_sender(raw_text: str) -> Optional[str]:
    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
    for line in lines[:5]:
        m = _LEGAL_SUFFIX_RE.search(line)
        if m:
            return m.group(1).strip()
        m = _BRAND_RE.search(line)
        if m:
            key = m.group(1).lower()
            canonical = _BRAND_CANONICAL.get(key)
            if canonical:
                return canonical
            return m.group(0).strip()
    return None


def _extract_date(raw_text: str) -> Optional[str]:
    m = _SAME_LINE_DATE_RE.search(raw_text)
    if m:
        result = _iso_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if result:
            return result
    m = _SAME_LINE_DE_DATE_RE.search(raw_text)
    if m:
        month = _GERMAN_MONTH.get(m.group(2).lower())
        if month:
            return _iso_date(int(m.group(1)), month, int(m.group(3)))
    lines = raw_text.splitlines()
    for i, line in enumerate(lines):
        if _DATE_LABEL_ONLY_RE.fullmatch(line.strip()):
            if i + 1 < len(lines):
                nxt = lines[i + 1].strip()
                num_m = re.match(r"^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{2,4})$", nxt)
                if num_m:
                    return _iso_date(
                        int(num_m.group(1)), int(num_m.group(2)), int(num_m.group(3))
                    )
                de_m = re.match(
                    rf"^(\d{{1,2}})\.\s*({_MONTH_PAT})\s*(\d{{4}})$", nxt, re.IGNORECASE
                )
                if de_m:
                    month = _GERMAN_MONTH.get(de_m.group(2).lower())
                    if month:
                        return _iso_date(int(de_m.group(1)), month, int(de_m.group(3)))
    return None


def _extract_invoice_number(raw_text: str) -> Optional[str]:
    m = _INVOICE_NR_RE.search(raw_text)
    return m.group(1).strip() if m else None


def extract_invoice_fields(raw_text: Optional[str]) -> dict[str, Optional[str]]:
    if not raw_text:
        return {"sender": None, "date": None, "rechnungsnr": None}
    return {
        "sender": _extract_sender(raw_text),
        "date": _extract_date(raw_text),
        "rechnungsnr": _extract_invoice_number(raw_text),
    }
