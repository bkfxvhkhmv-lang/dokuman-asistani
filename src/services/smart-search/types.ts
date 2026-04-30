import type { Dokument } from '@/store';

export type SearchIntent =
  | 'zahlung_ausstehend'
  | 'überfällig'
  | 'diese_woche'
  | 'risikoreich'
  | 'offene_aufgaben'
  | 'spezifischer_absender'
  | 'betrag_filter'
  | 'typ_filter'
  | 'freitext';

export interface SearchResult {
  dok: Dokument;
  score: number;
  matchedFields: string[];
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
  correctionHint: string | null;
  processingMs: number;
}

export interface SearchIndex {
  invertedIndex: Map<string, Set<string>>;
  builtAt: number;
}
