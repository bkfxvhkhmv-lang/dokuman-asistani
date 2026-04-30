/** Smart Categorization v2 — V12 AI Layer */

export type {
  CategoryResult,
  CategoryAlt,
  CategorySignal,
  InstitutionMatch,
} from './types';

export { SUB_CATEGORIES, INSTITUTION_DB } from './constants';

export { runSmartCategorization } from './runSmartCategorization';
export { applyCategoryToVisionResult } from './applyCategoryToVisionResult';
