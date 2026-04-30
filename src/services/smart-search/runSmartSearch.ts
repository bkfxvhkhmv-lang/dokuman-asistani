import type { Dokument } from '@/store';
import { parseNatuerlicheAbfrage } from '@/utils';
import type { SearchIntent, SearchResponse, SearchResult } from './types';
import { detectIntent } from './intent';
import { normalizeQuery, tokenize } from './queryText';
import { applyIntentFilter } from './intentFilter';
import { scoreField } from './scoring';
import { buildCorrectionHint } from './hints';

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

  let pool = mitErledigt ? docs : docs.filter(d => !d.erledigt);
  if (intent !== 'freitext' && intent !== 'betrag_filter' && intent !== 'typ_filter') {
    const intentDocs = applyIntentFilter(pool, intent);
    if (intentDocs.length > 0) pool = intentDocs;
  }

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

  const results: SearchResult[] = [];

  for (const dok of pool) {
    if (tokens.length === 0) {
      results.push({ dok, score: 50, matchedFields: ['intent'], highlights: [], intent });
      continue;
    }

    let totalScore = 0;
    const matchedFields: string[] = [];
    const highlights: typeof results[number]['highlights'] = [];

    const fields: [string, string | null | undefined][] = [
      ['titel', dok.titel],
      ['absender', dok.absender],
      ['typ', dok.typ],
      ['zusammenfassung', dok.zusammenfassung],
      ['kurzfassung', dok.kurzfassung],
      ['etiketten', (dok.etiketten || []).join(' ')],
      ['rohText', dok.rohText?.slice(0, 500)],
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
      const normalizedScore = Math.min(100, Math.round(totalScore / (tokens.length * 3)));
      results.push({ dok, score: normalizedScore, matchedFields, highlights, intent });
    }
  }

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
