/**
 * Smart Search v2 — V12 Sprint 3
 *
 * Offline-first intent-aware search:
 * - Intent detection (what does the user WANT to find?)
 * - Pre-built inverted index for instant token matching
 * - Multi-field relevance scoring with highlights
 * - Query normalization + synonym expansion
 * - Online: hybrid semantic (v4 API) merged with local results
 */

import type { Dokument } from '../store';
import { parseNatuerlicheAbfrage } from '../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SearchIntent =
  | 'zahlung_ausstehend'    // "was muss ich zahlen"
  | 'überfällig'            // "überfällige", "zu spät"
  | 'diese_woche'           // "diese Woche fällig"
  | 'risikoreich'           // "riskante", "gefährliche Dokumente"
  | 'offene_aufgaben'       // "was muss ich tun"
  | 'spezifischer_absender' // "Finanzamt", "Vodafone"
  | 'betrag_filter'         // "über 100€"
  | 'typ_filter'            // "alle Rechnungen"
  | 'freitext';             // unrecognized — fallback

export interface SearchResult {
  dok: Dokument;
  score: number;              // 0–100 relevance
  matchedFields: string[];    // which fields matched
  highlights: SearchHighlight[];
  intent?: SearchIntent;
}

export interface SearchHighlight {
  field: string;
  excerpt: string;
  matchStart: number;
  matchLength: number;
}

export interface SearchResponse {
  results: SearchResult[];
  intent: SearchIntent;
  intentLabel: string;
  totalFound: number;
  queryNormalized: string;
  correctionHint: string | null;  // did-you-mean suggestions
  processingMs: number;
}

// ── Intent detection ───────────────────────────────────────────────────────────

const INTENT_PATTERNS: { pattern: RegExp; intent: SearchIntent; label: string }[] = [
  { pattern: /(?:zahlen|zahlung|offen|bezahlen|fällig|schulde)/i,          intent: 'zahlung_ausstehend', label: 'Offene Zahlungen' },
  { pattern: /(?:überfällig|zu spät|abgelaufen|verpasst|verspätet)/i,     intent: 'überfällig',         label: 'Überfällige Dokumente' },
  { pattern: /(?:diese woche|diese[rn] woche|nächste tage|bald fällig)/i, intent: 'diese_woche',        label: 'Diese Woche fällig' },
  { pattern: /(?:riskant|gefährlich|dringend|kritisch|hoch.*risiko)/i,    intent: 'risikoreich',         label: 'Risikoreiche Dokumente' },
  { pattern: /(?:aufgaben|was.*tun|was.*machen|todo|erledigen)/i,         intent: 'offene_aufgaben',     label: 'Offene Aufgaben' },
];

const BETRAG_PATTERN = /(?:über|unter|mehr als|weniger als|[\d]+\s*€)/i;
const TYP_PATTERN = /(?:rechnung|mahnung|bußgeld|steuerbescheid|versicherung|vertrag|termin)/i;

export function detectIntent(query: string): { intent: SearchIntent; label: string } {
  const lower = query.toLowerCase().trim();
  for (const { pattern, intent, label } of INTENT_PATTERNS) {
    if (pattern.test(lower)) return { intent, label };
  }
  if (BETRAG_PATTERN.test(lower)) return { intent: 'betrag_filter', label: 'Betragssuche' };
  if (TYP_PATTERN.test(lower))   return { intent: 'typ_filter',    label: 'Typsuche' };
  return { intent: 'freitext', label: 'Freitextsuche' };
}

// ── Query normalization ────────────────────────────────────────────────────────

const SYNONYME: Record<string, string[]> = {
  'rechnung':       ['invoice', 'faktura', 'rechng',
                     // TR→DE (#111)
                     'fatura', 'ödeme', 'fiyat'],
  'mahnung':        ['zahlungserinnerung', 'inkasso',
                     'hatırlatma', 'ödeme hatırlatma'],
  'bußgeld':        ['bussgeld', 'strafzettel', 'ordnungswidrigk', 'verwarnungsgeld',
                     'ceza', 'para cezası', 'trafik cezası'],
  'steuerbescheid': ['steuern', 'finanzamt', 'steuer',
                     'vergi', 'vergi bildirimi', 'gelir vergisi'],
  'versicherung':   ['police', 'versich',
                     'sigorta', 'sigorta poliçe'],
  'vertrag':        ['vereinbarung', 'contract',
                     'sözleşme', 'kontrat', 'anlaşma'],
  'kündigung':      ['kuendigung', 'kündigt',
                     'iptal', 'fesih'],
  'miete':          ['mietzahlung', 'nebenkosten',
                     'kira', 'kira ödemesi'],
  'arzt':           ['krankenhaus', 'gesundheit',
                     'doktor', 'hastane', 'sağlık'],
  'auto':           ['kfz', 'fahrzeug',
                     'araç', 'otomobil', 'araba'],
  'bank':           ['konto', 'sparkasse',
                     'banka', 'hesap'],
  'überfällig':     ['fällig', 'ausstehend',
                     'gecikmiş', 'vadesi geçmiş'],
};

// ── Fuzzy match — accepts prefix or Levenshtein ≤ 1 (#111) ─────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/** Returns true if token fuzzy-matches query (prefix OR lev-distance ≤ 1 for tokens ≥ 4 chars) */
export function fuzzyMatch(token: string, query: string): boolean {
  if (token.startsWith(query)) return true;
  if (query.length >= 4 && token.length >= 4) return levenshtein(token, query) <= 1;
  return false;
}

export function normalizeQuery(query: string): string {
  let q = query.toLowerCase().trim();
  // Replace common typos / synonyms
  for (const [canonical, synonyme] of Object.entries(SYNONYME)) {
    for (const syn of synonyme) {
      if (q.includes(syn)) {
        q = q.replace(new RegExp(syn, 'g'), canonical);
      }
    }
  }
  return q;
}

// ── Token extraction ───────────────────────────────────────────────────────────

function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\säöüÄÖÜß]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

// ── Field scoring ─────────────────────────────────────────────────────────────

const FIELD_WEIGHTS: Record<string, number> = {
  titel:           10,
  absender:        8,
  typ:             7,
  zusammenfassung: 5,
  kurzfassung:     5,
  etiketten:       6,
  rohText:         2,
};

function scoreField(
  fieldValue: string | null | undefined,
  tokens: string[],
  fieldName: string,
): { score: number; highlight: SearchHighlight | null } {
  if (!fieldValue || tokens.length === 0) return { score: 0, highlight: null };

  const lower = fieldValue.toLowerCase();
  const weight = FIELD_WEIGHTS[fieldName] || 3;
  let score = 0;
  let highlight: SearchHighlight | null = null;

  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx >= 0) {
      score += weight;
      if (!highlight) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(fieldValue.length, idx + token.length + 30);
        highlight = {
          field: fieldName,
          excerpt: (start > 0 ? '…' : '') + fieldValue.slice(start, end) + (end < fieldValue.length ? '…' : ''),
          matchStart: idx - start + (start > 0 ? 1 : 0),
          matchLength: token.length,
        };
      }
      // Exact phrase bonus
      if (lower === token) score += weight * 2;
      // Starts-with bonus
      if (lower.startsWith(token)) score += weight;
    }
  }

  return { score, highlight };
}

// ── Intent-based filtering ─────────────────────────────────────────────────────

function applyIntentFilter(docs: Dokument[], intent: SearchIntent): Dokument[] {
  const heute = new Date(); heute.setHours(0, 0, 0, 0);

  switch (intent) {
    case 'zahlung_ausstehend':
      return docs.filter(d => !d.erledigt && d.betrag && (d.betrag as number) > 0);
    case 'überfällig':
      return docs.filter(d => !d.erledigt && d.frist && new Date(d.frist) < heute);
    case 'diese_woche': {
      const wochenende = new Date(heute); wochenende.setDate(wochenende.getDate() + 7);
      return docs.filter(d => {
        if (!d.frist || d.erledigt) return false;
        const f = new Date(d.frist);
        return f >= heute && f <= wochenende;
      });
    }
    case 'risikoreich':
      return docs.filter(d => d.risiko === 'hoch' && !d.erledigt);
    case 'offene_aufgaben':
      return docs.filter(d => !d.erledigt && (d.aufgaben || []).some(a => !(a as any).erledigt));
    default:
      return docs;
  }
}

// ── Did-you-mean / correction hint ────────────────────────────────────────────

function buildCorrectionHint(query: string, results: SearchResult[]): string | null {
  if (results.length > 0) return null;

  // Suggest common queries if nothing found
  const suggestions: [RegExp, string][] = [
    [/^[a-z]{1,4}$/i, 'Tipp: Versuchen Sie einen vollständigen Begriff'],
    [/fin.?amt|steuer/i, '"Steuerbescheid" oder "Finanzamt" suchen?'],
    [/voda|telekom|o2/i, 'Nach Telefonanbieter-Rechnungen suchen?'],
  ];
  for (const [re, hint] of suggestions) {
    if (re.test(query)) return hint;
  }
  return null;
}

// ── Main search function ───────────────────────────────────────────────────────

export function runSmartSearch(
  query: string,
  docs: Dokument[],
  options: { mitErledigt?: boolean; maxResults?: number } = {},
): SearchResponse {
  const start = Date.now();
  const { mitErledigt = false, maxResults = 50 } = options;

  if (!query || query.trim().length < 1) {
    return {
      results: [],
      intent: 'freitext',
      intentLabel: 'Freitextsuche',
      totalFound: 0,
      queryNormalized: '',
      correctionHint: null,
      processingMs: 0,
    };
  }

  const normalized = normalizeQuery(query);
  const { intent, label: intentLabel } = detectIntent(query);
  const parsed = parseNatuerlicheAbfrage(normalized);
  const tokens = tokenize(parsed.restQuery || normalized);

  // Filter by intent first (fast pre-filter)
  let pool = mitErledigt ? docs : docs.filter(d => !d.erledigt);
  if (intent !== 'freitext' && intent !== 'betrag_filter' && intent !== 'typ_filter') {
    const intentDocs = applyIntentFilter(pool, intent);
    // If intent filter found results, use it; otherwise fall back to full pool
    if (intentDocs.length > 0) pool = intentDocs;
  }

  // Numeric filters from NLP
  if (parsed.minBetrag || parsed.maxBetrag) {
    const min = parsed.minBetrag ? parseFloat(parsed.minBetrag) : 0;
    const max = parsed.maxBetrag ? parseFloat(parsed.maxBetrag) : Infinity;
    pool = pool.filter(d => {
      const b = (d.betrag as number) || 0;
      return b >= min && b <= max;
    });
  }
  if (parsed.typ) {
    pool = pool.filter(d => d.typ.toLowerCase() === parsed.typ.toLowerCase());
  }
  if (parsed.risiko) {
    pool = pool.filter(d => d.risiko === parsed.risiko);
  }
  if (parsed.vonDatum || parsed.bisDatum) {
    pool = pool.filter(d => {
      if (!d.datum) return false;
      const dt = new Date(d.datum);
      if (parsed.vonDatum && dt < new Date(parsed.vonDatum)) return false;
      if (parsed.bisDatum && dt > new Date(parsed.bisDatum + 'T23:59:59')) return false;
      return true;
    });
  }
  if (parsed.ueberfaellig) {
    pool = pool.filter(d => d.frist && new Date(d.frist) < new Date());
  }

  // Score remaining docs against tokens
  const results: SearchResult[] = [];

  for (const dok of pool) {
    if (tokens.length === 0) {
      // Intent-only match — all pool docs qualify with base score
      results.push({ dok, score: 50, matchedFields: ['intent'], highlights: [], intent });
      continue;
    }

    let totalScore = 0;
    const matchedFields: string[] = [];
    const highlights: SearchHighlight[] = [];

    const fields: [string, string | null | undefined][] = [
      ['titel', dok.titel],
      ['absender', dok.absender],
      ['typ', dok.typ],
      ['zusammenfassung', dok.zusammenfassung],
      ['kurzfassung', dok.kurzfassung],
      ['etiketten', (dok.etiketten || []).join(' ')],
      ['rohText', dok.rohText?.slice(0, 500)],  // limit rawText search
    ];

    for (const [name, value] of fields) {
      const { score, highlight } = scoreField(value, tokens, name);
      if (score > 0) {
        totalScore += score;
        matchedFields.push(name);
        if (highlight) highlights.push(highlight);
      }
    }

    if (totalScore > 0) {
      // Normalize to 0–100
      const normalizedScore = Math.min(100, Math.round(totalScore / (tokens.length * 3)));
      results.push({ dok, score: normalizedScore, matchedFields, highlights, intent });
    }
  }

  // Sort by score desc, then by frist asc for equal scores
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const fa = a.dok.frist ? new Date(a.dok.frist).getTime() : Infinity;
    const fb = b.dok.frist ? new Date(b.dok.frist).getTime() : Infinity;
    return fa - fb;
  });

  const limited = results.slice(0, maxResults);
  const correctionHint = buildCorrectionHint(query, limited);

  return {
    results: limited,
    intent,
    intentLabel,
    totalFound: results.length,
    queryNormalized: normalized,
    correctionHint,
    processingMs: Date.now() - start,
  };
}

// ── Search index builder (optional pre-computation) ────────────────────────────

export interface SearchIndex {
  invertedIndex: Map<string, Set<string>>;   // token → Set<docId>
  builtAt: number;
}

export function buildSearchIndex(docs: Dokument[]): SearchIndex {
  const invertedIndex = new Map<string, Set<string>>();

  for (const dok of docs) {
    const fields = [dok.titel, dok.absender, dok.typ, dok.zusammenfassung, (dok.etiketten || []).join(' ')];
    const tokens = tokenize(fields.join(' '));
    for (const token of tokens) {
      if (!invertedIndex.has(token)) invertedIndex.set(token, new Set());
      invertedIndex.get(token)!.add(dok.id);
    }
  }

  return { invertedIndex, builtAt: Date.now() };
}

export function queryIndex(index: SearchIndex, query: string): Set<string> {
  const tokens = tokenize(normalizeQuery(query));
  if (tokens.length === 0) return new Set();

  // For each query token, collect matching index keys (exact + fuzzy #111)
  const sets = tokens.map(qt => {
    const exact = index.invertedIndex.get(qt);
    if (exact) return exact;
    // Fuzzy fallback: scan index keys for prefix / lev-1 match
    const merged = new Set<string>();
    for (const [key, ids] of index.invertedIndex.entries()) {
      if (fuzzyMatch(key, qt)) ids.forEach(id => merged.add(id));
    }
    return merged;
  });

  return sets.length > 1
    ? new Set([...sets[0]].filter(id => sets.every(s => s.has(id))))
    : sets[0];
}
