import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

const TYPE_KEY_MAP: Record<string, string> = {
  dokument: 'doc.type.document',
  sonstiges: 'doc.type.other',
  unbekannt: 'doc.type.unknown',
  rechnung: 'doc.type.invoice',
  mahnung: 'doc.type.reminder',
  bußgeld: 'doc.type.fine',
  bussgeld: 'doc.type.fine',
  behörde: 'doc.type.authority',
  behorde: 'doc.type.authority',
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
};

export function translateDocumentTypeLabel(raw: string | null | undefined, lang = getLangSync()): string {
  const text = String(raw ?? '').trim();
  if (!text) return t(lang, 'doc.type.unknown');
  const key = TYPE_KEY_MAP[text.toLowerCase()];
  return key ? t(lang, key) : text;
}
