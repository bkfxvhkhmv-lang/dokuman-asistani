/**
 * Smart Categorization v2 — V12 AI Layer
 *
 * Mantık `./smart-categorization/` altında; bu dosya geriye dönük import yolu sağlar.
 */

export type {
  CategoryResult,
  CategoryAlt,
  CategorySignal,
  InstitutionMatch,
} from '@/services/smart-categorization';

export { SUB_CATEGORIES, INSTITUTION_DB, runSmartCategorization, applyCategoryToVisionResult } from '@/services/smart-categorization';
