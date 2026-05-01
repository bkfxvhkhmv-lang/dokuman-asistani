/**
 * Standardized user-facing error messages.
 * Never show raw technical errors (500, "worker failed", stack traces) to users.
 * Use these strings everywhere — keep the voice calm and helpful.
 */

export const ErrorMessages = {
  /** OCR / document recognition failed */
  ocr: 'Wir konnten den Text nicht sicher erkennen. Du kannst das Dokument trotzdem speichern und die wichtigsten Felder prüfen.',

  /** Upload / save to local storage failed */
  upload: 'Das Dokument konnte gerade nicht gespeichert werden. Bitte versuche es erneut.',

  /** Export (PDF, ZIP, Steuerpaket) failed */
  export: 'Der Export konnte nicht erstellt werden. Bitte versuche es erneut.',

  /** In-app purchase failed */
  purchase: 'Der Kauf konnte nicht abgeschlossen werden. Bitte versuche es später erneut.',

  /** Generic fallback — use only when nothing more specific fits */
  generic: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',

  /** Network / offline */
  network: 'Keine Verbindung. Das Dokument wurde gespeichert. Du kannst die Erkennung später erneut versuchen.',
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
