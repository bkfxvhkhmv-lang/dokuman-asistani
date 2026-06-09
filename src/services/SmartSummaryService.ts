/**
 * Smart Summary — `./smart-summary/` altında; geriye dönük import yolu.
 */
export type { SummaryMode, SummaryResult } from '@/services/smart-summary';
export {
  buildKurzSatz,
  buildKernPunkte,
  buildLocalSummary,
  buildSmartSummary,
  getCachedSummary,
  cacheSummary,
} from '@/services/smart-summary';
