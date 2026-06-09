export type SuggestionType =
  | 'zahlen'
  | 'einspruch'
  | 'pdf_export'
  | 'teilen'
  | 'archivieren'
  | 'kalender'
  | 'erinnerung'
  | 'erklären'
  | 'aufgabe'
  | 'verknüpfen'
  | 'kündigen'
  | 'verlängern'
  | 'prüfen';

export type SuggestionPriority = 'kritisch' | 'hoch' | 'mittel' | 'niedrig';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  titel: string;
  beschreibung: string;
  icon: string;
  priority: SuggestionPriority;
  score: number;
  aktion: string;
  aktionLabel: string;
  kontext: string;
  verfallsdatum?: string;
  badge?: string;
}

export interface SuggestionsResult {
  suggestions: Suggestion[];
  topSuggestion: Suggestion | null;
  kategorien: Record<SuggestionPriority, Suggestion[]>;
}

export interface HomeSuggestion {
  icon: string;
  titel: string;
  beschreibung: string;
  priority: SuggestionPriority;
  dokId?: string;
  aktion: string;
}
