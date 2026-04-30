/**
 * Ziel-Contract GET /documents/{id} (API) — `next_action` ist für Action-First-UI verbindlich.
 * Backend kann Felder schrittweise ausrollen; Client normalisiert fehlende Werte lokal.
 */
export type NextActionType = 'pay' | 'reply' | 'calendar' | 'review' | 'other';

export interface DocumentNextAction {
  type: NextActionType;
  label: string;
}

/** Normalisierte Server-Antwort (Teilmenge — erweiterbar mit Bild/Pages). */
export interface DocumentDetailContract {
  id: string;
  status: 'pending' | 'processing' | 'action_needed' | 'done';
  amount?: number | null;
  due_date?: string | null;
  summary?: string | null;
  /** Pflicht sobald Backend Action-Engine ausliefert. */
  next_action: DocumentNextAction;
}
