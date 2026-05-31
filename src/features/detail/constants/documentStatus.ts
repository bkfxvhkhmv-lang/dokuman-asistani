/**
 * Document status model — canonical 4-state system.
 *
 * Sprint 2 rule: status is computed, never stored raw.
 * Call `computeDocumentStatus()` at render time from the Dokument fields.
 */
import type { Dokument } from '@/store';
import { needsManualReview } from '@/utils/documentGuards';

export type DocumentStatus = 'urgent' | 'open' | 'needs_review' | 'done';

export interface DocumentStatusUi {
  label: string;
  colorKey: 'danger' | 'warning' | 'success' | 'textSecondary';
}

export const DOCUMENT_STATUS_UI: Record<DocumentStatus, DocumentStatusUi> = {
  urgent:       { label: 'Dringend',    colorKey: 'danger' },
  open:         { label: 'Offen',       colorKey: 'warning' },
  needs_review: { label: 'Prüfen',      colorKey: 'warning' },
  done:         { label: 'Erledigt',    colorKey: 'success' },
};

/**
 * Derives a DocumentStatus from a Dokument at render time.
 *
 * Priority order:
 *  1. done   — user explicitly marked erledigt
 *  2. urgent — deadline ≤ 2 days OR Mahnung/Bußgeld type
 *  3. needs_review — low confidence OR missing critical fields
 *  4. open   — default
 */
export function computeDocumentStatus(dok: Dokument): DocumentStatus {
  if (dok.erledigt) return 'done';

  const daysUntilDue = dok.frist
    ? Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86_400_000)
    : null;

  const isUrgentType = /mahnung|bußgeld|bussgeld|vollstreckung/i.test(dok.typ ?? '');

  if (daysUntilDue !== null && daysUntilDue <= 2) return 'urgent';
  if (isUrgentType && (daysUntilDue === null || daysUntilDue <= 7)) return 'urgent';

  if (needsManualReview(dok)) return 'needs_review';

  return 'open';
}

/**
 * Processing state for the scan → analyse pipeline.
 * Used in KameraScreen / ProcessingScreen to drive UI.
 */
export type DocumentProcessingState =
  | 'idle'
  | 'captured'
  | 'optimizing'
  | 'processing'
  | 'action_ready'
  | 'needs_review'
  | 'failed';

export const PROCESSING_TIMEOUT_MS = 8_000;

export const PROCESSING_COPY: Record<DocumentProcessingState, string> = {
  idle:         '',
  captured:     'Dokument wird vorbereitet …',
  optimizing:   'Bild wird optimiert …',
  processing:   'KI erkennt Daten …',
  action_ready: 'Fertig',
  needs_review: 'Wir konnten nicht alles automatisch erkennen.',
  failed:       'Die Erkennung konnte nicht abgeschlossen werden.',
};

export const PROCESSING_FALLBACK_CTA = {
  title:   'Bitte kurz prüfen',
  body:    'Du kannst die wichtigsten Felder kurz prüfen und das Dokument trotzdem speichern.',
  actions: ['Felder prüfen', 'Trotzdem weiter', 'Neu scannen'] as const,
};

/** Error messages shown to users — technical strings are forbidden in UI. */
export const ERROR_COPY = {
  ocr_failed:     'Wir konnten den Text nicht sicher erkennen.\nDu kannst das Dokument trotzdem speichern und die wichtigsten Felder prüfen.',
  upload_failed:  'Das Dokument konnte gerade nicht hochgeladen werden.\nEs bleibt auf deinem Gerät gespeichert.',
  export_failed:  'Der Export konnte nicht erstellt werden.\nBitte versuche es erneut.',
  generic:        'Etwas ist schiefgelaufen.\nDeine Daten sind gesichert.',
} as const;
