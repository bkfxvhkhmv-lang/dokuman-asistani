import type { Dokument } from '@/store';

export interface SmartFieldRow {
  icon: string;
  label: string;
  value: string;
}

export function buildSmartFieldRows(dok: Dokument): SmartFieldRow[] {
  const smartFields: SmartFieldRow[] = [];
  if (dok.iban) smartFields.push({ icon: '🏦', label: 'IBAN', value: dok.iban });
  if (dok.aktenzeichen) smartFields.push({ icon: '📋', label: 'Aktenzeichen', value: dok.aktenzeichen });
  if (dok.rechnungsnr) smartFields.push({ icon: '🧾', label: 'Rechnungs-Nr.', value: dok.rechnungsnr });
  if (dok.kundennr) smartFields.push({ icon: '👤', label: 'Kunden-Nr.', value: dok.kundennr });
  if (dok.vertragsnr) smartFields.push({ icon: '📄', label: 'Vertrags-Nr.', value: dok.vertragsnr });
  if (dok.zahlungszweck)
    smartFields.push({ icon: '💬', label: 'Verwendungs-\nzweck', value: dok.zahlungszweck });
  if (dok.steuerid) smartFields.push({ icon: '🔢', label: 'Steuer-ID', value: dok.steuerid });
  if (dok.garantieBis) smartFields.push({ icon: '🛡️', label: 'Garantie bis', value: dok.garantieBis });
  return smartFields;
}
