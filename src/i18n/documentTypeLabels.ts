import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

const TYPE_KEY_MAP: Record<string, string> = {
  alle: 'common.all',
  dokument: 'doc.type.document',
  sonstiges: 'doc.type.other',
  unbekannt: 'doc.type.unknown',
  rechnung: 'doc.type.invoice',
  rechnungen: 'doc.type.invoice_plural',
  mahnung: 'doc.type.reminder',
  bußgeld: 'doc.type.fine',
  bussgeld: 'doc.type.fine',
  behörde: 'doc.type.authority',
  behorde: 'doc.type.authority',
  'behörden / amt': 'doc.type.authority_group',
  'behorden / amt': 'doc.type.authority_group',
  behörden: 'doc.type.authority_group',
  behorden: 'doc.type.authority_group',
  behördenbrief: 'doc.type.official_letter',
  behordenbrief: 'doc.type.official_letter',
  behördenpost: 'doc.type.official_mail',
  behordenpost: 'doc.type.official_mail',
  formular: 'doc.type.form',
  vertrag: 'doc.type.contract',
  versicherung: 'doc.type.insurance',
  termin: 'doc.type.appointment',
  steuerbescheid: 'doc.type.tax_notice',
  kaufbeleg: 'doc.type.receipt',
  gutschrift: 'doc.type.credit_note',
  nebenkosten: 'doc.type.utilities',
  nachweise: 'doc.type.proofs',
};

export function translateDocumentTypeLabel(raw: string | null | undefined, lang = getLangSync()): string {
  const text = String(raw ?? '').trim();
  if (!text) return t(lang, 'doc.type.unknown');
  const key = TYPE_KEY_MAP[text.toLowerCase()];
  return key ? t(lang, key) : text;
}

/**
 * Resolves a user-facing label for an OCR document kind.
 * Uses the `ocr.doctype.*` key space; falls back to the raw kind string
 * (e.g. a German word returned by the backend) or 'ocr.doctype.unknown'
 * rather than ever leaking a raw `ocr.doctype.XYZ` key to the UI.
 *
 * @param kind - OCR kind slug (e.g. "invoice", "Mahnung", null)
 * @param translate - bound t() from useT(); must accept a key and return a string
 */
export function resolveOcrDocTypeLabel(
  kind: string | null | undefined,
  translate: (key: string) => string,
): string {
  const k = (kind ?? '').trim();
  if (!k || k === 'unknown') return translate('ocr.doctype.unknown');
  const key = `ocr.doctype.${k}`;
  const result = translate(key);
  if (result !== key) return result;
  return k;
}
