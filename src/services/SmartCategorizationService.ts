/**
 * Smart Categorization v2 — V12 AI Layer
 *
 * Multi-signal categorization:
 * - Primary type + sub-category
 * - Confidence score
 * - Institution DB matching
 * - Alternative suggestions
 * - User confirmation payload
 */

import type { DocumentAnalysis } from './visionApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CategoryResult {
  typ:          string;
  subtyp:       string | null;
  confidence:   number;             // 0–100
  alternatives: CategoryAlt[];
  signale:      CategorySignal[];   // why this category was chosen
  institution:  InstitutionMatch | null;
  hatirlatma:   string | null;      // context-aware hint for user
}

export interface CategoryAlt {
  typ:     string;
  subtyp:  string | null;
  score:   number;
}

export interface CategorySignal {
  quelle: 'keyword' | 'institution_db' | 'betrag_pattern' | 'layout' | 'absender';
  beschreibung: string;
  gewicht: number;
}

export interface InstitutionMatch {
  name: string;
  typ: string;
  subtyp: string | null;
  icon: string;
  land: string;
  confidence: number;
}

// ── Sub-categories ─────────────────────────────────────────────────────────────

export const SUB_CATEGORIES: Record<string, string[]> = {
  Rechnung:         ['Strom/Gas', 'Wasser', 'Miete/Nebenkosten', 'Telefon/Internet', 'Versicherung', 'Handwerk/Reparatur', 'Einkauf', 'Abonnement', 'Sonstige Rechnung'],
  Mahnung:          ['1. Mahnung', '2. Mahnung', '3. Mahnung / Letzte Mahnung', 'Inkasso-Mahnung'],
  Bußgeld:          ['Verkehrsdelikt', 'Parkvergehen', 'Ordnungsamt', 'Sonstiges Bußgeld'],
  Steuerbescheid:   ['Einkommensteuer', 'Umsatzsteuer', 'Körperschaftsteuer', 'Gewerbesteuer', 'Grundsteuer', 'Sonstiger Steuerbescheid'],
  Kündigung:        ['Mietvertrag', 'Arbeitsvertrag', 'Versicherung', 'Mobilfunkvertrag', 'Sonstige Kündigung'],
  Termin:           ['Behörden-Termin', 'Arzt-Termin', 'Gericht-Termin', 'Sonstiger Termin'],
  Versicherung:     ['Krankenversicherung', 'Kfz-Versicherung', 'Haftpflicht', 'Hausrat', 'Lebensversicherung', 'Sonstige Versicherung'],
  Vertrag:          ['Mietvertrag', 'Arbeitsvertrag', 'Mobilfunk', 'Internet', 'Strom/Gas', 'Sonstiger Vertrag'],
  Behördenbescheid: ['Ausländerbehörde', 'Finanzamt', 'Sozialamt', 'Jobcenter', 'Krankenamt', 'Sonstiger Bescheid'],
  Sonstiges:        [],
};

// ── Institution database ───────────────────────────────────────────────────────

export const INSTITUTION_DB: {
  pattern: RegExp;
  name: string;
  typ: string;
  subtyp: string | null;
  icon: string;
  land: string;
}[] = [
  // Behörden
  { pattern: /finanzamt/i,              name: 'Finanzamt',             typ: 'Steuerbescheid',   subtyp: 'Einkommensteuer',    icon: '🏛', land: 'DE' },
  { pattern: /ausländer(?:behörde|amt)/i,name: 'Ausländerbehörde',    typ: 'Behördenbescheid', subtyp: 'Ausländerbehörde',   icon: '🏛', land: 'DE' },
  { pattern: /jobcenter/i,              name: 'Jobcenter',             typ: 'Behördenbescheid', subtyp: 'Jobcenter',          icon: '🏛', land: 'DE' },
  { pattern: /sozialamt/i,              name: 'Sozialamt',             typ: 'Behördenbescheid', subtyp: 'Sozialamt',          icon: '🏛', land: 'DE' },
  { pattern: /kranken(?:kasse|amt)/i,   name: 'Krankenkasse',          typ: 'Behördenbescheid', subtyp: 'Krankenamt',         icon: '🏥', land: 'DE' },
  { pattern: /ordnungsamt/i,            name: 'Ordnungsamt',           typ: 'Bußgeld',          subtyp: 'Ordnungsamt',        icon: '🚔', land: 'DE' },
  { pattern: /bußgeldstelle/i,          name: 'Bußgeldstelle',         typ: 'Bußgeld',          subtyp: 'Verkehrsdelikt',     icon: '🚔', land: 'DE' },
  // Telecom
  { pattern: /vodafone/i,               name: 'Vodafone',              typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  { pattern: /telekom|deutsche telekom/i,name: 'Deutsche Telekom',    typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  { pattern: /o2|telefónica/i,          name: 'O2',                    typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  { pattern: /1&1|1und1/i,              name: '1&1',                   typ: 'Rechnung',         subtyp: 'Internet',           icon: '🌐', land: 'DE' },
  { pattern: /freenet/i,                name: 'Freenet',               typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  // Energie
  { pattern: /eon\b|e\.on/i,            name: 'E.ON',                  typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /rwe\b/i,                  name: 'RWE',                   typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /stadtwerke/i,             name: 'Stadtwerke',            typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /enBW/i,                   name: 'EnBW',                  typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /vattenfall/i,             name: 'Vattenfall',            typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  // Banken
  { pattern: /commerzbank/i,            name: 'Commerzbank',           typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /sparkasse/i,              name: 'Sparkasse',             typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /deutsche bank/i,          name: 'Deutsche Bank',         typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /postbank/i,               name: 'Postbank',              typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /volksbank|raiffeisen/i,   name: 'Volksbank',             typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  // Versicherungen
  { pattern: /allianz/i,                name: 'Allianz',               typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /axa\b/i,                  name: 'AXA',                   typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /huk.coburg/i,             name: 'HUK-Coburg',            typ: 'Versicherung',     subtyp: 'Kfz-Versicherung',   icon: '', land: 'DE' },
  { pattern: /generali/i,               name: 'Generali',              typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /ergo\b/i,                 name: 'ERGO',                  typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /r\+v|r und v/i,           name: 'R+V',                   typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /zurich\b/i,               name: 'Zurich',                typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  // Streaming/Abo
  { pattern: /netflix/i,                name: 'Netflix',               typ: 'Rechnung',         subtyp: 'Abonnement',         icon: '📺', land: 'INT' },
  { pattern: /spotify/i,                name: 'Spotify',               typ: 'Rechnung',         subtyp: 'Abonnement',         icon: '🎵', land: 'INT' },
  { pattern: /amazon\s*(prime|aws)?/i,  name: 'Amazon',                typ: 'Rechnung',         subtyp: 'Abonnement',         icon: '📦', land: 'INT' },
  // Inkasso
  { pattern: /inkasso|collection/i,     name: 'Inkasso',               typ: 'Mahnung',          subtyp: 'Inkasso-Mahnung',    icon: '⚠️', land: 'DE' },
  { pattern: /coeo\b|creditreform|intrum/i, name: 'Inkasso-Büro',      typ: 'Mahnung',          subtyp: 'Inkasso-Mahnung',    icon: '⚠️', land: 'DE' },
];

// ── Keyword scoring per type ───────────────────────────────────────────────────

const TYPE_KEYWORDS: Record<string, { words: string[]; weight: number }[]> = {
  Rechnung: [
    { words: ['rechnung', 'rechnungsnr', 'rechnungsdatum'], weight: 25 },
    { words: ['mwst', 'mehrwertsteuer', 'ust'], weight: 20 },
    { words: ['gesamtbetrag', 'endbetrag', 'nettobetrag'], weight: 20 },
    { words: ['invoice', 'faktura'], weight: 15 },
    { words: ['fällig', 'zahlungsfrist'], weight: 10 },
  ],
  Mahnung: [
    { words: ['mahnung', 'zahlungserinnerung'], weight: 40 },
    { words: ['rückstand', 'säumnis', 'verzug'], weight: 25 },
    { words: ['letzte', 'endgültig', 'unverzüglich'], weight: 15 },
    { words: ['forderung', 'offener betrag'], weight: 10 },
  ],
  Bußgeld: [
    { words: ['bußgeld', 'bussgeldbescheid', 'ordnungswidrigkeit'], weight: 45 },
    { words: ['verwarnungsgeld', 'tatzeit', 'tatort'], weight: 30 },
    { words: ['einspruch', 'betroffene'], weight: 15 },
  ],
  Steuerbescheid: [
    { words: ['steuerbescheid', 'finanzamt'], weight: 40 },
    { words: ['einkommensteuer', 'körperschaftsteuer', 'umsatzsteuer'], weight: 30 },
    { words: ['steuer-id', 'steuernummer'], weight: 20 },
  ],
  Kündigung: [
    { words: ['kündigung', 'kündigt hiermit', 'gekündigt'], weight: 50 },
    { words: ['kündigungsfrist', 'vertragsende'], weight: 30 },
  ],
  Versicherung: [
    { words: ['versicherung', 'police', 'versicherungsnehmer'], weight: 40 },
    { words: ['versicherungsschein', 'versicherungssumme'], weight: 30 },
    { words: ['prämie', 'beitrag'], weight: 20 },
  ],
  Vertrag: [
    { words: ['vertrag', 'vertragspartner', 'vereinbarung'], weight: 35 },
    { words: ['laufzeit', 'mindestlaufzeit'], weight: 25 },
    { words: ['unterschrift', 'unterzeichnet'], weight: 20 },
  ],
  Behördenbescheid: [
    { words: ['bescheid', 'behörde', 'amt', 'verwaltung'], weight: 30 },
    { words: ['antrag', 'genehmigung', 'ablehnung'], weight: 25 },
    { words: ['rechtsmittel', 'widerspruch', 'klage'], weight: 20 },
  ],
  Termin: [
    { words: ['termin', 'vorladung', 'einladung'], weight: 40 },
    { words: ['erscheinen', 'persönlich'], weight: 20 },
  ],
};

// ── Sub-category detection ─────────────────────────────────────────────────────

function detectSubtyp(typ: string, text: string, absender: string | null): string | null {
  const lower = text.toLowerCase();
  const abs = (absender || '').toLowerCase();

  if (typ === 'Rechnung') {
    if (/strom|gas|energie|kwh/.test(lower + abs)) return 'Strom/Gas';
    if (/wasser|abwasser/.test(lower + abs)) return 'Wasser';
    if (/miete|nebenkosten|mietkosten/.test(lower + abs)) return 'Miete/Nebenkosten';
    if (/telefon|handy|mobil|internet|dsl/.test(lower + abs)) return 'Telefon/Internet';
    if (/versicherung/.test(lower)) return 'Versicherung';
    if (/netflix|spotify|amazon|abo|abonnement/.test(lower + abs)) return 'Abonnement';
    if (/handwerk|reparatur|montage|installation/.test(lower)) return 'Handwerk/Reparatur';
    return 'Sonstige Rechnung';
  }
  if (typ === 'Mahnung') {
    if (/letzte\s+mahnung|inkasso|anwalt/i.test(text)) return '3. Mahnung / Letzte Mahnung';
    if (/2\.?\s*mahnung|zweite\s+mahnung/i.test(text)) return '2. Mahnung';
    return '1. Mahnung';
  }
  if (typ === 'Bußgeld') {
    if (/parkend|parkvergehen|parkplatz/i.test(text)) return 'Parkvergehen';
    if (/ordnungsamt/i.test(text + abs)) return 'Ordnungsamt';
    return 'Verkehrsdelikt';
  }
  if (typ === 'Steuerbescheid') {
    if (/einkommensteuer/i.test(text)) return 'Einkommensteuer';
    if (/umsatzsteuer/i.test(text)) return 'Umsatzsteuer';
    if (/grundsteuer/i.test(text)) return 'Grundsteuer';
    if (/gewerbesteuer/i.test(text)) return 'Gewerbesteuer';
    return 'Sonstiger Steuerbescheid';
  }
  if (typ === 'Versicherung') {
    if (/kfz|auto|fahrzeug/i.test(text + abs)) return 'Kfz-Versicherung';
    if (/kranken/i.test(text + abs)) return 'Krankenversicherung';
    if (/haftpflicht/i.test(text)) return 'Haftpflicht';
    if (/hausrat/i.test(text)) return 'Hausrat';
    return 'Sonstige Versicherung';
  }
  if (typ === 'Kündigung') {
    if (/miet/i.test(text)) return 'Mietvertrag';
    if (/arbeit|stell/i.test(text)) return 'Arbeitsvertrag';
    if (/mobil|handy|telefon/i.test(text)) return 'Mobilfunkvertrag';
    return 'Sonstige Kündigung';
  }
  if (typ === 'Vertrag') {
    if (/miet/i.test(text)) return 'Mietvertrag';
    if (/arbeit|arbeitsvertrag/i.test(text)) return 'Arbeitsvertrag';
    if (/mobil|handy/i.test(text + abs)) return 'Mobilfunk';
    if (/strom|gas/i.test(text + abs)) return 'Strom/Gas';
    return 'Sonstiger Vertrag';
  }
  if (typ === 'Behördenbescheid') {
    if (/ausländer/i.test(text + abs)) return 'Ausländerbehörde';
    if (/finanzamt/i.test(text + abs)) return 'Finanzamt';
    if (/jobcenter/i.test(text + abs)) return 'Jobcenter';
    if (/sozialamt/i.test(text + abs)) return 'Sozialamt';
    return 'Sonstiger Bescheid';
  }
  return null;
}

// ── Institution matching ───────────────────────────────────────────────────────

function matchInstitution(text: string, absender: string | null): InstitutionMatch | null {
  const haystack = `${text} ${absender || ''}`;
  for (const inst of INSTITUTION_DB) {
    if (inst.pattern.test(haystack)) {
      return {
        name:       inst.name,
        typ:        inst.typ,
        subtyp:     inst.subtyp,
        icon:       inst.icon,
        land:       inst.land,
        confidence: 90,
      };
    }
  }
  return null;
}

// ── Hatırlatma hint per category ──────────────────────────────────────────────

const HATIRLATMA: Record<string, string | null> = {
  Rechnung:         'Zahlung bis zur Frist vorbereiten',
  Mahnung:          'Sofort handeln — Mahnkosten steigen schnell',
  Bußgeld:          '14 Tage Einspruchsfrist beachten',
  Steuerbescheid:   '1 Monat Einspruchsfrist (ab Bekanntgabe)',
  Kündigung:        'Kündigungsfristen und Rechte prüfen',
  Termin:           'Termin im Kalender eintragen',
  Versicherung:     'Jahresablauf und Kündigungsfristen notieren',
  Vertrag:          'Laufzeit und Kündigungsfristen prüfen',
  Behördenbescheid: 'Rechtsmittelfristen beachten',
  Sonstiges:        null,
};

// ── Main classification ────────────────────────────────────────────────────────

export function runSmartCategorization(
  visionResult: DocumentAnalysis,
  rohText: string,
): CategoryResult {
  const lower = rohText.toLowerCase();
  const absender = visionResult.absender;

  // Score all types
  const typeScores: { typ: string; score: number; signale: CategorySignal[] }[] = [];

  for (const [typ, groups] of Object.entries(TYPE_KEYWORDS)) {
    let score = 0;
    const signale: CategorySignal[] = [];
    for (const { words, weight } of groups) {
      const hits = words.filter(w => lower.includes(w));
      if (hits.length > 0) {
        score += weight;
        signale.push({ quelle: 'keyword', beschreibung: `"${hits[0]}" gefunden`, gewicht: weight });
      }
    }
    typeScores.push({ typ, score, signale });
  }

  // Institution DB boost
  const instMatch = matchInstitution(rohText, absender);
  if (instMatch) {
    const existing = typeScores.find(t => t.typ === instMatch.typ);
    if (existing) {
      existing.score += 30;
      existing.signale.push({ quelle: 'institution_db', beschreibung: `Bekannte Institution: ${instMatch.name}`, gewicht: 30 });
    }
  }

  // Absender signals
  if (absender && absender !== 'Unbekannter Absender') {
    const absLower = absender.toLowerCase();
    const absSignals: [RegExp, string, string][] = [
      [/finanzamt/i, 'Steuerbescheid', `Absender enthält "Finanzamt"`],
      [/mahnung|inkasso/i, 'Mahnung', `Absender enthält "Mahnung"`],
      [/versicherung/i, 'Versicherung', `Absender ist Versicherung`],
    ];
    for (const [p, typ, desc] of absSignals) {
      if (p.test(absLower)) {
        const t = typeScores.find(x => x.typ === typ);
        if (t) { t.score += 20; t.signale.push({ quelle: 'absender', beschreibung: desc, gewicht: 20 }); }
      }
    }
  }

  // Sort by score
  typeScores.sort((a, b) => b.score - a.score);

  const best = typeScores[0];
  const winner = best.score > 0 ? best.typ : (visionResult.typ !== 'Sonstiges' ? visionResult.typ : 'Sonstiges');
  const winnerScore = best.score;

  // Normalize to 0-100
  const maxPossible = 100;
  const confidence = Math.min(100, Math.round((winnerScore / maxPossible) * 100));

  const subtyp = detectSubtyp(winner, rohText, absender);

  // Alternatives (next best with score > 10)
  const alternatives: CategoryAlt[] = typeScores
    .slice(1, 4)
    .filter(t => t.score > 10)
    .map(t => ({
      typ:    t.typ,
      subtyp: detectSubtyp(t.typ, rohText, absender),
      score:  Math.min(100, Math.round((t.score / maxPossible) * 100)),
    }));

  // If institution matched and overrides type, update match confidence
  if (instMatch && instMatch.typ !== winner) {
    instMatch.confidence = Math.max(60, confidence - 10);
  }

  return {
    typ:         winner,
    subtyp,
    confidence,
    alternatives,
    signale:     best.signale,
    institution: instMatch,
    hatirlatma:  HATIRLATMA[winner] ?? null,
  };
}

// ── Apply to document ─────────────────────────────────────────────────────────

export function applyCategoryToVisionResult(
  visionResult: DocumentAnalysis,
  catResult: CategoryResult,
): DocumentAnalysis {
  return {
    ...visionResult,
    typ: catResult.typ,
  };
}
