import type { Dokument } from '@/store';
import { fuzzyMatch, normalizeQuery, tokenize } from './queryText';
import type { SearchIndex } from './types';

export type { SearchIndex } from './types';

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

  const sets = tokens.map(qt => {
    const exact = index.invertedIndex.get(qt);
    if (exact) return exact;
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
