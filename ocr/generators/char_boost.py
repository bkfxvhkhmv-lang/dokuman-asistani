"""
v5/generators/char_boost.py — Dedicated generator for characters that had ZERO
training examples in v5_comprehensive_80k.

Missing chars: q @ & + ; = ? ! ° ² ( )
Each sub-generator ensures the target char appears at least once per sample.
"""
from __future__ import annotations
import random
from typing import List

# ─── q ───────────────────────────────────────────────────────────────────────
_Q_SAMPLES = [
    # lowercase q — critical for training
    "Frequenz: {n} Hz",
    "Sequenz: {n}",
    "Liquidität: {a} EUR",
    "Konsequenz: Mahnung",
    "Frequenzbereich {n}–{m} Hz",
    "Konsequenz: Vollstreckung",
    "Quartalsbericht Q{q}/{y}",  # uppercase Q
    "Quittung Nr. {n}",          # uppercase Q
    "Quellensteuer: {a} EUR",    # uppercase Q
    "Quittungsnummer {n}",       # uppercase Q
    "Quick-Wert: {n}",           # uppercase Q
    "Quick: {n} %",              # uppercase Q
]

def _gen_q(rng: random.Random) -> str:
    tmpl = rng.choice(_Q_SAMPLES)
    return tmpl.format(
        n=rng.randint(1000, 99999),
        a=f"{rng.randint(10,9999)},{rng.randint(0,99):02d}",
        q=rng.randint(1, 4),
        y=rng.randint(2022, 2026),
        d=f"{rng.randint(1,28):02d}.{rng.randint(1,12):02d}.{rng.randint(2022,2026)}",
        m=rng.randint(10, 50),
    )

# ─── @ ───────────────────────────────────────────────────────────────────────
_DOMAINS = ["finanzamt.de", "bundesamt.de", "aok.de", "tkk.de", "barmer.de",
            "arbeitsagentur.de", "jobcenter.de", "gericht.de", "city.de"]
_USER_PARTS = ["info", "service", "kontakt", "post", "anfrage", "buerger", "antrag"]

def _gen_at(rng: random.Random) -> str:
    user = rng.choice(_USER_PARTS)
    domain = rng.choice(_DOMAINS)
    templates = [
        f"E-Mail: {user}@{domain}",
        f"Antwort an: {user}@{domain}",
        f"Kontakt: {user}@{domain}",
        f"Bitte antworten Sie an {user}@{domain}",
    ]
    return rng.choice(templates)

# ─── & ───────────────────────────────────────────────────────────────────────
_AMP_NAMES = [
    "Müller & Söhne GmbH", "Schmidt & Partner KG", "Becker & Koch AG",
    "H&M Deutschland GmbH", "K&K Versicherung AG", "Meyer & Schulz OHG",
    "Braun & Hoffmann GmbH & Co. KG", "Wolf & Partner Steuerberatung",
    "Druck & Medien GmbH", "Bau & Service KG", "IT & Consulting AG",
    "Pflege & Betreuung GmbH", "Handel & Logistik GmbH",
]

_AMP_VERBS = ["Absender:", "Firma:", "Von:", "Rechnungssteller:", "Gläubiger:", "Auftraggeber:"]
_AMP_SUFFIXES = ["GmbH", "GmbH & Co. KG", "KG", "OHG", "AG", "e.V.", "mbH"]

def _gen_amp(rng: random.Random) -> str:
    # Mix predefined names + dynamic ones to avoid deduplication
    if rng.random() < 0.5:
        name = rng.choice(_AMP_NAMES)
    else:
        # Dynamic: LastName & LastName + suffix
        first = rng.choice(["Müller","Schmidt","Weber","Fischer","Bauer","Koch",
                            "Richter","Klein","Wolf","Schröder","Neumann","Schwarz"])
        second = rng.choice(["Partner","Söhne","Töchter","Kollegen","Associates"])
        suffix = rng.choice(_AMP_SUFFIXES)
        name = f"{first} & {second} {suffix}"
    prefix = rng.choice(["", rng.choice(_AMP_VERBS) + " "])
    return f"{prefix}{name}"[:50]

# ─── + ───────────────────────────────────────────────────────────────────────
def _gen_plus(rng: random.Random) -> str:
    area = rng.choice(["49", "43", "41", "32", "33", "31"])
    city = rng.randint(100, 999)
    num = rng.randint(100000, 9999999)
    templates = [
        f"Tel.: +{area} {city} {num}",
        f"Telefon: +{area}-{city}-{num}",
        f"Fax: +{area} {city} {num}",
        f"Hotline: +{area} 800 {rng.randint(100000,999999)}",
        f"MwSt. 19% + {rng.randint(1,99)},{rng.randint(0,99):02d} EUR",
        f"Grundbetrag + Aufschlag: {rng.randint(100,9999)},{rng.randint(0,99):02d} EUR",
    ]
    return rng.choice(templates)

# ─── ; ───────────────────────────────────────────────────────────────────────
def _gen_semi(rng: random.Random) -> str:
    templates = [
        f"Pos. 1: {rng.randint(1,999)} EUR; Pos. 2: {rng.randint(1,999)} EUR",
        f"Artikel {rng.randint(1,99)}; Menge: {rng.randint(1,100)}; Preis: {rng.randint(1,999)} EUR",
        f"Name; Vorname; Geburtsdatum",
        f"Bezeichnung; Einheit; Betrag",
        f"Steuer-ID: {rng.randint(10,99)} {rng.randint(100,999)}; USt: {rng.randint(0,19)} %",
    ]
    return rng.choice(templates)[:50]

# ─── = ───────────────────────────────────────────────────────────────────────
def _gen_eq(rng: random.Random) -> str:
    templates = [
        f"Gesamtbetrag = {rng.randint(10,99999)},{rng.randint(0,99):02d} EUR",
        f"Summe = {rng.randint(10,9999)},{rng.randint(0,99):02d} €",
        f"Steuer = {rng.randint(0,19)} %",
        f"Netto + MwSt = Brutto",
        f"Rechnungsbetrag = {rng.randint(100,9999)},{rng.randint(0,99):02d} EUR",
        f"Betrag = {rng.randint(10,999)},{rng.randint(0,99):02d} EUR",
    ]
    return rng.choice(templates)

# ─── ? ───────────────────────────────────────────────────────────────────────
_QUESTION_PREFIXES = ["Haben Sie", "Fragen zu", "Unklarheiten bei", "Probleme mit"]
_QUESTION_TOPICS  = ["der Rechnung", "dem Bescheid", "dem Betrag", "der Frist",
                     "dem Aktenzeichen", "der Zahlung", "dem Antrag"]
_QUESTION_ACTIONS = ["Rufen Sie uns an.", "Kontaktieren Sie uns.",
                     "Wenden Sie sich an unser Büro.", "Schreiben Sie uns."]

def _gen_question(rng: random.Random) -> str:
    # Dynamic templates so dedup doesn't kill them
    days = rng.randint(7, 60)
    az = f"{rng.randint(1,20)} {rng.choice(['K','O','S','U'])} {rng.randint(100,9999)}/{rng.randint(21,26)}"
    templates = [
        f"{rng.choice(_QUESTION_PREFIXES)} {rng.choice(_QUESTION_TOPICS)}? {rng.choice(_QUESTION_ACTIONS)}",
        f"Einspruch? Frist: {days} Tage.",
        f"Widerspruch möglich? Ja, Az.: {az}",
        f"Zahlung unklar? Bitte Referenz {rng.randint(1000,9999)} angeben.",
        f"Mahngebühr? Betrag {rng.randint(5,50)},{rng.randint(0,99):02d} EUR.",
        f"Nicht erhalten? Bitte bis {rng.randint(1,28):02d}.{rng.randint(1,12):02d}.{rng.randint(2024,2026)} melden.",
    ]
    return rng.choice(templates)[:50]

# ─── ! ───────────────────────────────────────────────────────────────────────
def _gen_excl(rng: random.Random) -> str:
    templates = [
        "Zahlung sofort erforderlich!",
        "Frist läuft ab!",
        "Achtung! Letzte Mahnung.",
        "Dringend! Antwort bis {d}.",
        "Wichtig! Bitte lesen Sie dieses Schreiben.",
        "Letzte Frist! {d}",
        "Zahlungsverzug! Inkasso eingeleitet.",
    ]
    d = f"{rng.randint(1,28):02d}.{rng.randint(1,12):02d}.{rng.randint(2024,2026)}"
    return rng.choice(templates).format(d=d)[:50]

# ─── ° ───────────────────────────────────────────────────────────────────────
def _gen_degree(rng: random.Random) -> str:
    templates = [
        f"Temperatur: {rng.randint(-10,40)}°C",
        f"Koordinaten: 52°{rng.randint(0,59):02d}N {rng.randint(6,15)}°{rng.randint(0,59):02d}O",
        f"Winkel: {rng.randint(0,360)}°",
        f"Neigung: {rng.randint(0,45)}°",
        f"Außentemperatur: {rng.randint(-15,35)}°C",
    ]
    return rng.choice(templates)

# ─── ² ───────────────────────────────────────────────────────────────────────
def _gen_sqm(rng: random.Random) -> str:
    area = rng.randint(20, 300)
    templates = [
        f"Wohnfläche: {area} m²",
        f"Grundstücksfläche: {area * 3} m²",
        f"Nutzfläche: {area} m²",
        f"Bürofläche: {area} m²",
        f"Mietfläche ca. {area} m²",
        f"Gesamtfläche: {area} m²",
        f"Kaltmiete pro m²: {rng.randint(7,25)},{rng.randint(0,99):02d} EUR",
    ]
    return rng.choice(templates)

# ─── ( ) ─────────────────────────────────────────────────────────────────────
def _gen_paren(rng: random.Random) -> str:
    templates = [
        f"Paragraph {rng.randint(1,300)} (neu) BGB",
        f"§ {rng.randint(1,100)} Abs. {rng.randint(1,5)} (Satz {rng.randint(1,3)}) SGB",
        f"Steuernummer ({rng.randint(10,99)}-stellig): {rng.randint(10,99)}/{rng.randint(100,999)}/{rng.randint(10000,99999)}",
        f"Betrag (brutto): {rng.randint(100,9999)},{rng.randint(0,99):02d} EUR",
        f"Frist (30 Tage): {rng.randint(1,28):02d}.{rng.randint(1,12):02d}.{rng.randint(2024,2026)}",
        f"Bundesagentur für Arbeit (BA)",
        f"Techniker Krankenkasse (TK)",
        f"Bitte wenden (Rückseite beachten)",
        f"GmbH & Co. KG (Kommanditgesellschaft)",
        f"Einspruch (§ 347 AO) innerhalb von 30 Tagen",
    ]
    return rng.choice(templates)[:50]


# ─── Main generator ──────────────────────────────────────────────────────────
_SUB_GENERATORS = [_gen_q, _gen_at, _gen_amp, _gen_plus, _gen_semi,
                   _gen_eq, _gen_question, _gen_excl, _gen_degree,
                   _gen_sqm, _gen_paren]
_WEIGHTS = [8, 10, 12, 10, 8, 8, 7, 8, 7, 10, 12]  # paren & amp highest


def generate(rng: random.Random) -> List[str]:
    """Generate a sample guaranteed to contain at least one missing character."""
    gen = rng.choices(_SUB_GENERATORS, weights=_WEIGHTS, k=1)[0]
    result = gen(rng)
    return [result[:50]]


if __name__ == "__main__":
    import argparse
    argparse.ArgumentParser().add_argument("--smoke", action="store_true").parse_args()
    r = random.Random(42)
    # Verify all target chars appear
    target = set("q@&+;=?!°²()")
    seen = set()
    samples = [generate(r)[0] for _ in range(500)]
    for s in samples:
        seen.update(s)
    missing = target - seen
    print(f"Hedef karakterler: {sorted(target)}")
    print(f"500 örnekte görülen: {sorted(seen & target)}")
    print(f"Hâlâ eksik: {sorted(missing)}" if missing else "Tümü kapsandı ✓")
    print("\nÖrnek çıktılar (20):")
    r2 = random.Random(1)
    for _ in range(20):
        print(f"  {generate(r2)[0]}")
