import type { Dokument } from '@/store';

export interface SmartFieldRow {
  icon: string;
  label: string;
  value: string;
  aiSparkle: boolean;
}

export function buildSmartFieldRows(dok: Dokument): SmartFieldRow[] {
  const smartFields: SmartFieldRow[] = [];
  if (dok.iban)          smartFields.push({ icon: '🏦', label: 'IBAN',                value: dok.iban,          aiSparkle: true });
  if (dok.aktenzeichen)  smartFields.push({ icon: '📋', label: 'Aktenzeichen',         value: dok.aktenzeichen,  aiSparkle: true });
  if (dok.rechnungsnr)   smartFields.push({ icon: '🧾', label: 'Rechnungs-Nr.',        value: dok.rechnungsnr,   aiSparkle: true });
  if (dok.kundennr)      smartFields.push({ icon: '👤', label: 'Kunden-Nr.',           value: dok.kundennr,      aiSparkle: true });
  if (dok.vertragsnr)    smartFields.push({ icon: '📄', label: 'Vertrags-Nr.',         value: dok.vertragsnr,    aiSparkle: true });
  if (dok.zahlungszweck) smartFields.push({ icon: '💬', label: 'Verwendungs-\nzweck', value: dok.zahlungszweck, aiSparkle: true });
  if (dok.steuerid)      smartFields.push({ icon: '🔢', label: 'Steuer-ID',            value: dok.steuerid,      aiSparkle: true });
  if (dok.garantieBis)   smartFields.push({ icon: '🛡️', label: 'Garantie bis',         value: dok.garantieBis,   aiSparkle: true });
  return smartFields;
}
