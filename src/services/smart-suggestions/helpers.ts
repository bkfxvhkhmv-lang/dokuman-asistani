import type { Suggestion, SuggestionPriority, SuggestionType } from './types';

export function tageVerbleibend(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function makeSuggestion(
  type: SuggestionType,
  titel: string,
  beschreibung: string,
  icon: string,
  priority: SuggestionPriority,
  score: number,
  aktion: string,
  aktionLabel: string,
  kontext: string,
  extras: Partial<Suggestion> = {},
): Suggestion {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type, titel, beschreibung, icon, priority, score, aktion, aktionLabel, kontext,
    ...extras,
  };
}
