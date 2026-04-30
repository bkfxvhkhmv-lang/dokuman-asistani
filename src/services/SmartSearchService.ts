/**
 * Smart Search v2 — V12 Sprint 3
 *
 * Offline-first intent-aware search. Uygulama mantığı `./smart-search/` altında.
 */
export {
  detectIntent,
  fuzzyMatch,
  normalizeQuery,
  runSmartSearch,
  buildSearchIndex,
  queryIndex,
  type SearchIntent,
  type SearchResult,
  type SearchHighlight,
  type SearchResponse,
  type SearchIndex,
} from '@/services/smart-search';
