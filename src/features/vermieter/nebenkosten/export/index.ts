/**
 * D-3.4a — Nebenkosten PDF export public API
 */

export type { NkPdfExportResult } from './types';
export {
  NK_LETTER_DISCLAIMER_DE,
  escapeHtml,
  buildNkLetterHtml,
} from './letterHtml';
export { createNkLetterPdf, shareNkLetterPdf } from './exportNkLetterPdf';
