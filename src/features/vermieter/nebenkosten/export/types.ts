/**
 * D-3.4a — Nebenkosten PDF export result types
 */

export type NkPdfExportResult =
  | { ok: true; uri: string }
  | { ok: false; error: Error };
