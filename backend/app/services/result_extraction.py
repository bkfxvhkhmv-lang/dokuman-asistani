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

# Invoice number: extended labels + two-line support
_INVOICE_LABEL_RE = re.compile(
    r"(?:"
    r"rechnungsnummer|"
    r"rechnungs-?nr\.?|"
    r"rechnungsnr|"
    r"rech\.-?nr\.?|"
    r"rech\.?\s+nr\.?|"
    r"beleg-?nr\.?|"
    r"beleg\.?\s+nr\.?|"
    r"rechnung\s+nr\.?"
    r")\s*:?\s*",
    re.IGNORECASE,
)

_INVOICE_STOPWORDS = frozenset({
    "auf", "vom", "bis", "und", "der", "die", "das", "dem", "den",
    "am", "ist", "von", "fur", "für", "an", "zu", "im", "in", "bei", "ab",
    "mit", "ein", "eine", "unter", "angabe", "fallig", "fällig", "sofort",
    "des", "konto", "ihre", "ihren", "datum", "wert", "seite", "bitte",
})

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

# Lines that are clearly noise for sender extraction
_NOISE_LINE_RE = re.compile(
    r"(?:@|www\.|https?://|\biban\b|\bbic\b|steuer-?nr|st\.-nr|"
    r"tel\.?:|fax:|funk:|mobil:|e-?mail:|handelsregister|amtsgericht|"
    r"seite\s+\d|\bpage\b|gesch[äa]ftsf[üu]hrer)",
    re.IGNORECASE,
)

# Address-like lines: postal code + city, street suffix, etc.
_ADDRESS_LINE_RE = re.compile(
    r"(?:"
    r"\b\d{4,5}\s+\w|"
    r"stra[ßs]e|"
    r"[-\s]str\.?\s*\d|"
    r"\bweg\b|\bplatz\b|\bgasse\b|"
    r"postfach|postanschrift"
    r")",
    re.IGNORECASE,
)

# Contact line prefixes
_CONTACT_LINE_RE = re.compile(
    r"^(?:tel|fax|funk|mobil|e-?mail|www\.|http|info@)",
    re.IGNORECASE,
)

# Locative prepositions → likely street/location name, not company
_LOCATIVE_PREP_RE = re.compile(
    r"^(?:im\s|in\s+der\s|in\s+den\s|an\s+der\s|am\s|auf\s+der\s|bei\s|vor\s+dem?\s|zu[mr]\s)",
    re.IGNORECASE,
)

# Line ending with house number (1–4 digits, optional letter: "6", "13a")
_HOUSE_NUMBER_END_RE = re.compile(r"\s+\d{1,4}[a-zA-Z]?\s*$")

# Document/form labels that are never sender
_LABEL_LINE_RE = re.compile(
    r"^(?:datum|rechnung|beleg|seite|kunden|lieferschein|sachbearbeiter|"
    r"herrn?|frau|sehr geehrte|bitte|mit freundlich|vielen dank|hiermit|"
    r"beschreibung|menge|einzelpreis|gesamtpreis|pos\.)",
    re.IGNORECASE,
)

_DIGIT_ONLY_RE = re.compile(r"^[\d\s\.\,\-/]+$")

_BUSINESS_KW_RE = re.compile(
    r"\b(elektro|schornstein(?:feger)?|heizöl|heizoel|wasserwerk|sanitär|sanitaer|"
    r"baustoffe?|brennstoffe?|industrie(?:bedarf)?|service|dienste?|handel|technik|"
    r"installationen?|meister(?:betrieb)?|maler|maurer|dachdecker|"
    r"gruppe|center|zentrum|energie|strom|gas|wasser)\b",
    re.IGNORECASE,
)


def _iso_date(d: int, mo: int, y: int) -> str | None:
    if y < 100:
        y = 2000 + y if y <= 79 else 1900 + y
    if not (1 <= d <= 31 and 1 <= mo <= 12):
        return None
    return f"{y:04d}-{mo:02d}-{d:02d}"


def _is_noise_line(line: str) -> bool:
    if len(line) < 3:
        return True
    if _NOISE_LINE_RE.search(line):
        return True
    if _ADDRESS_LINE_RE.search(line):
        return True
    if _CONTACT_LINE_RE.match(line):
        return True
    if _LABEL_LINE_RE.match(line):
        return True
    if _DIGIT_ONLY_RE.match(line):
        return True
    if _LOCATIVE_PREP_RE.match(line):
        return True
    if _HOUSE_NUMBER_END_RE.search(line):
        return True
    return False


def _extract_sender(raw_text: str) -> Optional[str]:
    non_empty = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
    # Skip trivial single-char lines (like lone ".")
    substantive = [l for l in non_empty if len(l) >= 3]

    # Phase 1: legal suffix in first 8 substantive lines (handles GmbH glued to address)
    for line in substantive[:8]:
        m = _LEGAL_SUFFIX_RE.search(line)
        if m:
            return m.group(1).strip()

    # Phase 2: known brand in first 8 substantive lines
    for line in substantive[:8]:
        m = _BRAND_RE.search(line)
        if m:
            key = m.group(1).lower()
            canonical = _BRAND_CANONICAL.get(key)
            return canonical if canonical else m.group(0).strip()

    # Phase 3: header-aware fallback — business keyword or header-position heuristic
    for i, line in enumerate(substantive[:6]):
        if _is_noise_line(line):
            continue
        # Clear business keyword → safe when document has enough surrounding context
        if _BUSINESS_KW_RE.search(line) and len(substantive) >= 3:
            return line
        # Top header position (only position 0): use context to confirm this is a sender block
        if i == 0:
            next_lines = substantive[i + 1:i + 4]
            has_address = any(
                _ADDRESS_LINE_RE.search(nl) or _CONTACT_LINE_RE.match(nl)
                for nl in next_lines
            )
            if not has_address:
                continue
            words = [w for w in line.split() if any(c.isalpha() for c in w)]
            if len(words) >= 2:
                return line
            # Single-word candidate: accept only if starts uppercase (company/person-business)
            if len(words) == 1 and words[0][0].isupper():
                return line

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


def _valid_invoice_token(token: str) -> Optional[str]:
    t = token.strip().rstrip(".,;")
    if len(t) < 3:
        return None
    if not any(c.isdigit() for c in t):
        return None
    if t.lower() in _INVOICE_STOPWORDS:
        return None
    return t


def _extract_invoice_number(raw_text: str) -> Optional[str]:
    lines = raw_text.splitlines()
    for i, line in enumerate(lines):
        m = _INVOICE_LABEL_RE.search(line)
        if not m:
            continue
        # Same-line value
        rest = line[m.end():].strip()
        if rest:
            tok = rest.split()[0]
            valid = _valid_invoice_token(tok)
            if valid:
                return valid
        # Next-line value (two-line format)
        if i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if nxt:
                tok = nxt.split()[0]
                valid = _valid_invoice_token(tok)
                if valid:
                    return valid
    return None


def extract_invoice_fields(raw_text: Optional[str]) -> dict[str, Optional[str]]:
    if not raw_text:
        return {"sender": None, "date": None, "rechnungsnr": None}
    return {
        "sender": _extract_sender(raw_text),
        "date": _extract_date(raw_text),
        "rechnungsnr": _extract_invoice_number(raw_text),
    }
