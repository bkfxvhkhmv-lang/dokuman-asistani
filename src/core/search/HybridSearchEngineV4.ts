/**
 * HybridSearchEngineV4
 * Online  → sunucu hibrit arama (FTS + vektör embedding)
 * Offline → yerel BM25 benzeri skor hesaplama
 */
import { hybridSearch, smartSearch } from '../../services/v4Api';

export type SearchMode = 'text' | 'mix' | 'semantic';
export type SearchSource = 'server' | 'local';

export interface SearchResult {
  id:       string;
  score:    number;
  source:   SearchSource;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  mode:     SearchMode;
  topK?:    number;
  lang?:    string;
  offline?: boolean;       // true → sadece yerel arama
  localDocs?: Record<string, any>[];  // yerel belge listesi
}

// Sunucu ağırlıkları
const WEIGHTS: Record<SearchMode, { fts: number; vec: number }> = {
  text:     { fts: 1.0, vec: 0.0 },
  mix:      { fts: 0.6, vec: 0.4 },
  semantic: { fts: 0.1, vec: 0.9 },
};

// ── Lokal BM25-lite ───────────────────────────────────────────────────────────

const K1 = 1.5;
const B  = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')    // diakritik kaldır
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function termFreq(tokens: string[], term: string): number {
  return tokens.filter(t => t === term).length;
}

function bm25Score(
  docTokens: string[],
  queryTerms: string[],
  avgDocLen: number,
  idfMap: Map<string, number>,
): number {
  const dl = docTokens.length;
  return queryTerms.reduce((sum, term) => {
    const tf  = termFreq(docTokens, term);
    const idf = idfMap.get(term) ?? 0;
    const numerator   = tf * (K1 + 1);
    const denominator = tf + K1 * (1 - B + B * (dl / avgDocLen));
    return sum + idf * (numerator / denominator);
  }, 0);
}

function buildIdf(allTokens: string[][], queryTerms: string[]): Map<string, number> {
  const N = allTokens.length;
  const idf = new Map<string, number>();
  for (const term of queryTerms) {
    const df = allTokens.filter(tokens => tokens.includes(term)).length;
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }
  return idf;
}

function docToText(doc: Record<string, any>): string {
  return [doc.titel, doc.absender, doc.zusammenfassung, doc.rohText, doc.typ]
    .filter(Boolean)
    .join(' ');
}

function localBm25Search(
  query: string,
  docs: Record<string, any>[],
  topK: number,
): SearchResult[] {
  if (!docs.length) return [];

  const queryTerms  = tokenize(query);
  if (!queryTerms.length) return [];

  const allTokens   = docs.map(d => tokenize(docToText(d)));
  const avgDocLen   = allTokens.reduce((s, t) => s + t.length, 0) / allTokens.length;
  const idfMap      = buildIdf(allTokens, queryTerms);

  const scored = docs.map((doc, i) => ({
    doc,
    score: bm25Score(allTokens[i], queryTerms, avgDocLen, idfMap),
  }));

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ doc, score }) => ({
      id:     String(doc.id),
      score:  Math.round(score * 100) / 100,
      source: 'local' as SearchSource,
    }));
}

// ── Risk + tarih filtresi ─────────────────────────────────────────────────────

export interface FilterOptions {
  risiko?:    'hoch' | 'mittel' | 'niedrig';
  typ?:       string;
  minBetrag?: number;
  maxBetrag?: number;
  vonDatum?:  string;  // ISO date
  bisDatum?:  string;
}

function applyFilters(
  results: SearchResult[],
  docs: Record<string, any>[],
  filters: FilterOptions,
): SearchResult[] {
  const docMap = new Map(docs.map(d => [String(d.id), d]));
  return results.filter(r => {
    const doc = docMap.get(r.id);
    if (!doc) return true;
    if (filters.risiko && doc.risiko !== filters.risiko) return false;
    if (filters.typ    && doc.typ    !== filters.typ)    return false;
    if (filters.minBetrag !== undefined && (doc.betrag ?? 0) < filters.minBetrag) return false;
    if (filters.maxBetrag !== undefined && (doc.betrag ?? 0) > filters.maxBetrag) return false;
    if (filters.vonDatum && doc.datum && doc.datum < filters.vonDatum) return false;
    if (filters.bisDatum && doc.datum && doc.datum > filters.bisDatum) return false;
    return true;
  });
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class HybridSearchEngineV4 {
  static async search(
    query: string,
    options: SearchOptions = { mode: 'mix' },
    filters: FilterOptions = {},
  ): Promise<SearchResult[]> {
    const { mode, topK = 20, lang = 'tr', offline = false, localDocs = [] } = options;

    let results: SearchResult[] = [];

    if (offline || mode === 'text') {
      // Tamamen yerel BM25
      results = localBm25Search(query, localDocs, topK);
    } else {
      try {
        let raw: any;
        if (mode === 'semantic') {
          raw = await smartSearch(query, { topK, lang });
        } else {
          const { fts, vec } = WEIGHTS[mode];
          raw = await hybridSearch(query, { topK, ftsWeight: fts, vectorWeight: vec });
        }

        const items: any[] = raw?.results ?? [];
        results = items.map(item => ({
          id:       String(item.id ?? item.doc_id),
          score:    typeof item.score === 'number' ? item.score : 0,
          source:   'server' as SearchSource,
          metadata: item.metadata ?? undefined,
        }));
      } catch {
        // Sunucu erişilemez → yerel BM25 fallback
        results = localBm25Search(query, localDocs, topK);
      }
    }

    // Filtreler uygula (yerel doc listesi varsa)
    if (localDocs.length && Object.keys(filters).length) {
      results = applyFilters(results, localDocs, filters);
    }

    return results;
  }

  /** Sadece yerel BM25 — senkron wrapper */
  static searchLocal(
    query: string,
    docs: Record<string, any>[],
    topK: number = 20,
  ): SearchResult[] {
    return localBm25Search(query, docs, topK);
  }
}
