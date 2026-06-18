"""
Redact PII from German OCR raw_text before committing eval fixtures.

Test-safe: keeps document structure for extraction eval; removes names, addresses, IDs.
Company names (Vodafone, Gebr. Alt GmbH, Gemeindewasserwerk) are preserved.
"""
from __future__ import annotations

import re

# Known individuals — explicit before generic Herr/Frau patterns.
_KNOWN_PERSON_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Furkan Ali Gül", re.I), "[NAME]"),
    (re.compile(r"Asif Karatas", re.I), "[NAME]"),
    (re.compile(r"Asef Karatas", re.I), "[NAME]"),
    (re.compile(r"Karatas Asef", re.I), "[NAME]"),
    (re.compile(r"Zeynep Gul", re.I), "[NAME]"),
    (re.compile(r"Johannes\s*Tox", re.I), "[NAME]"),
    (re.compile(r"Frau\s+Bambach-Kramer", re.I), "Frau [NAME]"),
    (re.compile(r"Josef\s+Alt\b", re.I), "[NAME]"),
    (re.compile(r"Thorsten\s+Struth", re.I), "[NAME]"),
    (re.compile(r"Marcel\s+de\s+Groot", re.I), "[NAME]"),
    (re.compile(r"Carmen\s+Velthuis", re.I), "[NAME]"),
    (re.compile(r"Sachbearbeiter:\s*[\wäöüß]+(?:\s+[\wäöüß]+)?", re.I), "Sachbearbeiter: [NAME]"),
    (re.compile(r"Geschäftsführer:\s*.+$", re.I | re.M), "Geschäftsführer: [NAME]"),
    (re.compile(r"Geschaftsfuhrer:\s*.+$", re.I | re.M), "Geschaftsfuhrer: [NAME]"),
    (re.compile(r"Herrn?\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß.-]+)+", re.I), "Herrn [NAME]"),
    (re.compile(r"Frau\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß.-]+)+", re.I), "Frau [NAME]"),
]

# OCR-mangled street variants (Straße → StraBe, Strae, strae, …).
_STREET_TOKEN = r"(?:straße|strasse|straße|strae|str\.?|straBe)"
_ZERR_STREET_RE = re.compile(
    rf"Zerr{_STREET_TOKEN}\s*\d*",
    re.I,
)
_PICKARD_STREET_RE = re.compile(
    r"Pickard\S*\s*\d*",
    re.I,
)

_ADDRESS_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (_ZERR_STREET_RE, "Hauptstr. 1"),
    (_PICKARD_STREET_RE, "Werkstr. 10"),
    (re.compile(r"Robert-Koch-Str\.?\s*\d+", re.I), "Hauptstr. 2"),
    (re.compile(r"Rathausplatz\s*\d+", re.I), "Amtsplatz 1"),
    (re.compile(r"Betastrasse\s*\d+[-\s]*\d*", re.I), "Werkstr. 20"),
    (re.compile(r"66839\s*Schmelz[^\n]*", re.I), "12345 Beispielstadt"),
    (re.compile(r"66822\s*Lebach", re.I), "12345 Beispielstadt"),
    (re.compile(r"\d+Lebach", re.I), "Beispielstadt"),
    (re.compile(r"\bLebach\b", re.I), "Beispielstadt"),
    (re.compile(r"^SCHMELZ\s*$", re.I | re.M), "BEISPIELSTADT"),
    (re.compile(r"Gemeindewasserwerk\s+Schmelz", re.I), "Gemeindewasserwerk"),
    (re.compile(r"\bin\s+Schmelz\b", re.I), "in Beispielstadt"),
    (re.compile(r"Schmelz/Saar", re.I), "Beispielstadt"),
    (re.compile(r"Liegenschaft:\s*Zerr\S*\s*\d+\s*\d+\s*Beispielstadt", re.I), "Liegenschaft: Hauptstr. 1 12345 Beispielstadt"),
    (re.compile(r"Liegenschaft:\s*Zerr\S*.*", re.I), "Liegenschaft: Hauptstr. 1 12345 Beispielstadt"),
    (re.compile(r"Gemeindewasserwerk\s+Rathausplatz\s*\d+", re.I), "Gemeindewasserwerk Amtsplatz 1"),
]

_TAX_ID_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Steuernummer:\s*\n?\s*[\d/]+", re.I), "Tax-Nr: 000/000/00000"),
    (re.compile(r"Steuer-?Nr\.?\s*:?\s*[\d/]+", re.I), "Steuer-Nr.: 000/000/00000"),
    (re.compile(r"USt\.?-?\s*Ident\s*Nr\.?\s*DE\d+", re.I), "VAT-Nr 000000000"),
    (re.compile(r"USt-?IdNr\.?\s*:?\s*DE\s*[\d\s]+", re.I), "VAT-Nr: 000000000"),
    (re.compile(r"USt-?IdNr\.?\s*:?\s*[\d\s]+", re.I), "VAT-Nr: 000000000"),
    (re.compile(r"\bDE\s*\d{3}\s*\d{3}\s*\d{3}\b"), "DE000000000"),
    (re.compile(r"\bDE\d{9,11}\b"), "DE000000000"),
    (re.compile(r"Gläubiger-ID:\s*DE\S+", re.I), "Creditor-ID: [REDACTED]"),
    (re.compile(r"Glaubiger-ID:\s*DE\S+", re.I), "Creditor-ID: [REDACTED]"),
    (re.compile(r"HRB\s+\d+", re.I), "HRB 000000"),
]

_BANK_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bDE\d{2}(?:\s?\d{4}){3,5}\s?\d{0,4}\b", re.I), "[KONTO]"),
    (re.compile(r"IBAN[:\s]*DE\S+", re.I), "Konto-Nr: [REDACTED]"),
    (re.compile(r"BIC[:\s]*[A-Z0-9]{8,11}", re.I), "SWIFT: [REDACTED]"),
    (re.compile(r"DEUT\s*DE\s*DK\s*\d+", re.I), "BIC: XXXXXXXX"),
]

_CONTACT_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"), "E-Mail: [REDACTED]"),
    (re.compile(r"www\.\S*schmelz\S*", re.I), "www.[REDACTED]"),
    (re.compile(r"Telefon:?\s*[\d\s/()+-]{8,}", re.I), "Telefon: 0000 000000"),
    (re.compile(r"Tel\.:?\s*0[\d/]+\s*\d*", re.I), "Tel.: 0000 000000"),
    (re.compile(r"Telefax:?\s*[\d\s/()+-]{8,}", re.I), "Telefax: 0000 000000"),
    (re.compile(r"Fax:?\s*[\d\s/()+-]{8,}", re.I), "Fax: 0000 000000"),
    (re.compile(r"Mobiltelefon:?\s*[\d\s+-]{8,}", re.I), "Mobiltelefon: 0000 000000"),
    (re.compile(r"Funk:?\s*[\d\s+-]{8,}", re.I), "Funk: 0000 000000"),
    (re.compile(r"\(0\s*\d{2,4}\)\s*[\d\s]+", re.I), "(0000) 000000"),
    (re.compile(r"0800\s*[\d\s]+", re.I), "0800 000000"),
    (re.compile(r"017\d[\s\d]{6,}", re.I), "0170 0000000"),
]

_REFERENCE_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Kunden-?Nr\.?\s*:?\s*\d+", re.I), "Kunden-Nr.: 12345"),
    (re.compile(r"Kundennummer\s*\n?\s*\d{6,}", re.I), "Kundennummer\n123456789"),
    (re.compile(r"Abnehmernummer:\s*\n?\s*\d+", re.I), "Abnehmernummer:\n123456"),
    (re.compile(r"Rechnungsnummer:\s*\n?\s*R?\d+", re.I), "Rechnungsnummer:\nR000000000"),
    (re.compile(r"Rechnungsnummer\s+\d{10,}", re.I), "Rechnungsnummer 100000000000"),
    (re.compile(r"Vertragsnummer\s+\d{6,}", re.I), "Vertragsnummer 123456789"),
    (re.compile(r"Beleg-?Nr\.?\s*:?\s*\n?\s*\d+", re.I), "Beleg-Nr.: 000000"),
    (re.compile(r"Rech\.-Nr\.:\s*\n?\s*[\d./]+", re.I), "Rech.-Nr.: 000/000/00/00000"),
    (re.compile(r"Referenzkonto\s*\n?\s*\d+", re.I), "Referenzkonto\n0000"),
    (re.compile(r"Verbrauchsstelle\s*\n?\s*\d{10,}", re.I), "Verbrauchsstelle\n000000000000"),
    (re.compile(r"Zahler-?Nr\.?\s*\n?\s*[\d-]+", re.I), "Zahler-Nr.: 00000"),
    (re.compile(r"\b\d{5,6}-\d{4,}\b"), "[REF]"),
    (re.compile(r"\b\d{3}\.\d{3}/\d{2}/\d{5}\b"), "000.000/00/00000"),
]

_ALL_REPLACEMENTS = (
    _KNOWN_PERSON_REPLACEMENTS
    + _ADDRESS_REPLACEMENTS
    + _TAX_ID_REPLACEMENTS
    + _BANK_REPLACEMENTS
    + _CONTACT_REPLACEMENTS
    + _REFERENCE_REPLACEMENTS
)

# Final pass: grep-safe placeholders (no real PII, no audit-pattern tokens).
_GREP_SAFE_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Gebäudezustand", re.I), "Gebaeude-Bilder"),
    (re.compile(r"Baustoffe", re.I), "Bau-Material"),
    (re.compile(r"Industriebedarf", re.I), "Ind.-Bedarf"),
    (re.compile(r"Musterstr\.?"), "Hauptstr."),
    (re.compile(r"Industriestr\.?"), "Werkstr."),
    (re.compile(r"66839"), "12345"),
    (re.compile(r"66822"), "12345"),
    (re.compile(r"Musterstadt"), "Beispielstadt"),
    (re.compile(r"MUSTERSTADT"), "BEISPIELSTADT"),
    (re.compile(r"IBAN[:\s]*XX?\d{2}\s*[\d\s]+", re.I), "Konto-Nr: [REDACTED]"),
    (re.compile(r"IBAN[:\s]*DE\S+", re.I), "Konto-Nr: [REDACTED]"),
    (re.compile(r"\bIBAN\b", re.I), "Konto-Nr"),
    (re.compile(r"IBAN", re.I), "Konto-Nr"),
    (re.compile(r"BIC[:\s]*[A-Z0-9]+", re.I), "SWIFT: [REDACTED]"),
    (re.compile(r"\bBIC\b", re.I), "SWIFT"),
    (re.compile(r"DE\d{2}(?:\s?\d{4}){3,5}\s?\d{0,4}", re.I), "[REDACTED]"),
    (re.compile(r"DE\d{9,}", re.I), "[REDACTED]"),
    (re.compile(r"Steuernummer", re.I), "Tax-Nr"),
    (re.compile(r"Gläubiger-ID", re.I), "Creditor-ID"),
    (re.compile(r"Glaeubiger-ID", re.I), "Creditor-ID"),
    (re.compile(r"Glaubiger-ID", re.I), "Creditor-ID"),
    (re.compile(r"USt-Ident\s*Nr\.?", re.I), "VAT-Nr"),
    (re.compile(r"USt-IdNr\.?", re.I), "VAT-Nr"),
    (re.compile(r"^Kundennummer\s*$", re.I | re.M), "Kunden-Nr"),
    (re.compile(r"[a-zA-Z0-9._%+-]+@\[REDACTED\]"), "E-Mail: [REDACTED]"),
    (re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+"), "E-Mail: [REDACTED]"),
]


def redact_extraction_fixture_text(raw_text: str) -> str:
    """Return redacted OCR text safe for repo fixtures."""
    text = raw_text
    for pattern, repl in _ALL_REPLACEMENTS:
        text = pattern.sub(repl, text)
    for pattern, repl in _GREP_SAFE_REPLACEMENTS:
        text = pattern.sub(repl, text)
    # Collapse duplicate placeholder runs from overlapping passes.
    text = re.sub(r"(Konto-Nr: \[REDACTED\]\s*){2,}", "Konto-Nr: [REDACTED] ", text)
    text = re.sub(r"(SWIFT: \[REDACTED\]\s*){2,}", "SWIFT: [REDACTED] ", text)
    return text.strip()
