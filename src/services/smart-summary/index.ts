/** Smart Summary v2 — yerel şablon + isteğe bağlı AI açıklaması */

export type { SummaryMode, SummaryResult } from './types';

export { buildKurzSatz } from './kurzSatz';
export { buildKernPunkte } from './kernPunkte';
export { buildLocalSummary } from './localSummary';
export { buildSmartSummary } from './smartHybrid';
export { getCachedSummary, cacheSummary } from './cache';
