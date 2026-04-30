/**
 * Smart Suggestions — V12 Sprint 2
 *
 * Mantık `./smart-suggestions/` altında; bu dosya geriye dönük import yolu sağlar.
 */
export type {
  SuggestionType,
  SuggestionPriority,
  Suggestion,
  SuggestionsResult,
  HomeSuggestion,
} from '@/services/smart-suggestions';
export { runSmartSuggestions, runHomeSuggestions } from '@/services/smart-suggestions';
