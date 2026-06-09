import type { Dokument } from '@/store';
import { formatDatum } from '@/utils/formatters';

export interface SmartFieldRow {
  icon: string;
  label: string;
  value: string;
  aiSparkle: boolean;
}

export function buildSmartFieldRows(dok: Dokument): SmartFieldRow[] {
  const smartFields: SmartFieldRow[] = [];
  if (dok.iban)          smartFields.push({ icon: 'bank',          label: 'IBAN',                value: dok.iban,          aiSparkle: true });
  if (dok.aktenzeichen)  smartFields.push({ icon: 'clipboard-text',label: 'Aktenzeichen',         value: dok.aktenzeichen,  aiSparkle: true });
  if (dok.rechnungsnr)   smartFields.push({ icon: 'receipt',        label: 'Rechnungs-Nr.',        value: dok.rechnungsnr,   aiSparkle: true });
  if (dok.kundennr)      smartFields.push({ icon: 'user',           label: 'Kunden-Nr.',           value: dok.kundennr,      aiSparkle: true });
  if (dok.vertragsnr)    smartFields.push({ icon: 'document-text',  label: 'Vertrags-Nr.',         value: dok.vertragsnr,    aiSparkle: true });
  if (dok.zahlungszweck) smartFields.push({ icon: 'chat-circle',    label: 'Verwendungs-\nzweck', value: dok.zahlungszweck, aiSparkle: true });
  if (dok.steuerid)      smartFields.push({ icon: 'hash',           label: 'Steuer-ID',            value: dok.steuerid,      aiSparkle: true });
  if (dok.garantieBis)   smartFields.push({ icon: 'shield-check',   label: 'Garantie bis',         value: formatDatum(dok.garantieBis),   aiSparkle: true });
  return smartFields;
}
