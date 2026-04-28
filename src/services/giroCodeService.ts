export interface GiroCode {
  version: string;
  bic: string;
  iban: string;
  name: string;
  amount: number | null;
  purpose: string;
  reference: string;
  info: string;
}

export function parseGiroCode(rawText: string | null | undefined): GiroCode | null {
  if (!rawText) return null;
  const lines = rawText.trim().split('\n').map(l => l.trim());
  if (lines[0] !== 'BCD') return null;

  return {
    version:   lines[1] || '',
    bic:       lines[4] || '',
    iban:      lines[5] || '',
    name:      lines[6] || '',
    amount:    _parseAmount(lines[7] || ''),
    purpose:   lines[8] || '',
    reference: lines[9] || '',
    info:      lines[10] || '',
  };
}

function _parseAmount(raw: string): number | null {
  const match = raw.match(/EUR(\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1].replace(',', '.'));
}

export function giroCodeToText(parsed: GiroCode | null): string {
  if (!parsed) return '';
  const parts = [`Empfänger: ${parsed.name}`, `IBAN: ${parsed.iban}`];
  if (parsed.bic)       parts.push(`BIC: ${parsed.bic}`);
  if (parsed.amount)    parts.push(`Betrag: ${parsed.amount.toFixed(2)} €`);
  if (parsed.reference) parts.push(`Referenz: ${parsed.reference}`);
  if (parsed.info)      parts.push(`Info: ${parsed.info}`);
  return parts.join('\n');
}
