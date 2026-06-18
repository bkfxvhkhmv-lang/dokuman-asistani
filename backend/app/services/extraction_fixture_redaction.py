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
    (_ZERR_STREET_RE, "Musterstr. 1"),
    (_PICKARD_STREET_RE, "Industriestr. 10"),
    (re.compile(r"Robert-Koch-Str\.?\s*\d+", re.I), "Musterstr. 2"),
    (re.compile(r"Rathausplatz\s*\d+", re.I), "Amtsplatz 1"),
    (re.compile(r"Betastrasse\s*\d+[-\s]*\d*", re.I), "Industriestr. 20"),
    (re.compile(r"66839\s*Schmelz[^\n]*", re.I), "66839 Musterstadt"),
    (re.compile(r"66822\s*Lebach", re.I), "66822 Musterstadt"),
    (re.compile(r"\d+Lebach", re.I), "Musterstadt"),
    (re.compile(r"\bLebach\b", re.I), "Musterstadt"),
    (re.compile(r"^SCHMELZ\s*$", re.I | re.M), "MUSTERSTADT"),
    (re.compile(r"Gemeindewasserwerk\s+Schmelz", re.I), "Gemeindewasserwerk"),
    (re.compile(r"\bin\s+Schmelz\b", re.I), "in Musterstadt"),
    (re.compile(r"Schmelz/Saar", re.I), "Musterstadt"),
    (re.compile(r"Liegenschaft:\s*Zerr\S*\s*\d+\s*\d+\s*Musterstadt", re.I), "Liegenschaft: Musterstr. 1 66839 Musterstadt"),
    (re.compile(r"Liegenschaft:\s*Zerr\S*.*", re.I), "Liegenschaft: Musterstr. 1 66839 Musterstadt"),
    (re.compile(r"Gemeindewasserwerk\s+Rathausplatz\s*\d+", re.I), "Gemeindewasserwerk Amtsplatz 1"),
]

_TAX_ID_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"Steuernummer:\s*\n?\s*[\d/]+", re.I), "Steuernummer: 000/000/00000"),
    (re.compile(r"Steuer-?Nr\.?\s*:?\s*[\d/]+", re.I), "Steuer-Nr.: 000/000/00000"),
    (re.compile(r"USt\.?-?\s*Ident\s*Nr\.?\s*DE\d+", re.I), "USt-Ident Nr 000000000"),
    (re.compile(r"USt-?IdNr\.?\s*:?\s*DE\s*[\d\s]+", re.I), "USt-IdNr: 000000000"),
    (re.compile(r"USt-?IdNr\.?\s*:?\s*[\d\s]+", re.I), "USt-IdNr: 000000000"),
    (re.compile(r"\bDE\s*\d{3}\s*\d{3}\s*\d{3}\b"), "DE000000000"),
    (re.compile(r"\bDE\d{9,11}\b"), "DE000000000"),
    (re.compile(r"Gläubiger-ID:\s*DE\S+", re.I), "Glaeubiger-ID: DE00ZZZ00000000000"),
    (re.compile(r"Glaubiger-ID:\s*DE\S+", re.I), "Glaeubiger-ID: DE00ZZZ00000000000"),
    (re.compile(r"HRB\s+\d+", re.I), "HRB 000000"),
]

_BANK_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bDE\d{2}(?:\s?\d{4}){3,5}\s?\d{0,4}\b", re.I), "DE00 0000 0000 0000 0000 00"),
    (re.compile(r"IBAN[:\s]*DE\S+", re.I), "IBAN: DE00 0000 0000 0000 0000 00"),
    (re.compile(r"BIC[:\s]*[A-Z0-9]{8,11}", re.I), "BIC: XXXXXXXX"),
    (re.compile(r"DEUT\s*DE\s*DK\s*\d+", re.I), "BIC: XXXXXXXX"),
]

_CONTACT_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"), "kontakt@[REDACTED]"),
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


def redact_extraction_fixture_text(raw_text: str) -> str:
    """Return redacted OCR text safe for repo fixtures."""
    text = raw_text
    for pattern, repl in _ALL_REPLACEMENTS:
        text = pattern.sub(repl, text)
    # Collapse duplicate placeholder runs from overlapping passes.
    text = re.sub(r"(DE00 0000 0000 0000 0000 00\s*){2,}", "DE00 0000 0000 0000 0000 00 ", text)
    text = re.sub(r"(BIC: XXXXXXXX\s*){2,}", "BIC: XXXXXXXX ", text)
    text = re.sub(r"IBAN: DE00 0000 0000 0000 0000 00\s+0000 0000 0000 0000 00", "IBAN: DE00 0000 0000 0000 0000 00", text)
    text = re.sub(r"000000000DE000000000", "000000000", text)
    text = re.sub(r"USt-IdNr:\s*DE000000000", "USt-IdNr: 000000000", text)
    return text.strip()
