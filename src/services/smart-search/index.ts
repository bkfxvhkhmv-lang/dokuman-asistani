/** Smart Search — dışarıya satılan üst yüzey. */
export type {
  SearchIntent,
  SearchResult,
  SearchHighlight,
  SearchResponse,
  SearchIndex,
} from './types';
export { detectIntent } from './intent';
export { fuzzyMatch, normalizeQuery } from './queryText';
export { runSmartSearch } from './runSmartSearch';
export { buildSearchIndex, queryIndex } from './indexLookup';
