import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';
import { translateDocumentTypeLabel } from '@/i18n/documentTypeLabels';

const LEGACY_LABEL_KEY_MAP: Record<string, string> = {
  offen: 'home.filter.open',
  'in prüfung': 'detail.status.in_review',
  'in prufung': 'detail.status.in_review',
  dokument: 'doc.type.document',
  sonstiges: 'doc.type.other',
  formular: 'doc.type.form',
  unbekannt: 'doc.type.unknown',
  rechnungen: 'doc.type.invoice_plural',
  'behörden / amt': 'doc.type.authority_group',
  'behorden / amt': 'doc.type.authority_group',
  behörden: 'doc.type.authority_group',
  behorden: 'doc.type.authority_group',
  'zahlungsdaten prüfen': 'detail.next.check_payment_data',
  'zahlungsdaten prufen': 'detail.next.check_payment_data',
  bezahlt: 'detail.status.done',
  'e-mail': 'workflow.stamp.mail',
  einspruch: 'workflow.stamp.appeal',
  'heute bezahlt': 'workflow.timeline.paid_today',
  'heute bezahlt und partner informiert': 'workflow.timeline.paid_today_partner',
  'e-mail-entwurf vorbereitet': 'workflow.timeline.mail_prepared',
  'einspruch vorbereitet': 'workflow.timeline.appeal_prepared',
  'analyse...': 'pipeline.label.analyzing',
  'analyse…': 'pipeline.label.analyzing',
  'wartet...': 'pipeline.label.pending',
  'wartet…': 'pipeline.label.pending',
  'verarbeitung...': 'pipeline.label.processing',
  'verarbeitung…': 'pipeline.label.processing',
  bereit: 'pipeline.label.ready',
  fehler: 'common.error',
};

function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function translateLegacyBusinessLabel(raw: string | null | undefined, lang = getLangSync()): string {
  const text = String(raw ?? '').trim();
  if (!text) return text;
  const key = LEGACY_LABEL_KEY_MAP[normalizeLabel(text)];
  if (key) return t(lang, key);
  return translateDocumentTypeLabel(text, lang);
}
