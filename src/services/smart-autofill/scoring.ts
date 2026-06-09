import type { FieldConfidence, ExtractedFields } from './types';

export function scoreToConfidence(score: number): FieldConfidence {
  if (score === 0)   return 'fehlt';
  if (score >= 80)   return 'hoch';
  if (score >= 55)   return 'mittel';
  return 'niedrig';
}

export function scoreBetrag(betrag: number | null, text: string): number {
  if (betrag === null) return 0;
  const matches = [
    /gesamtbetrag/i, /endbetrag/i, /zu\s+zahlen/i, /summe/i,
  ].filter(p => p.test(text)).length;
  if (matches >= 2) return 92;
  if (matches === 1) return 78;
  return 55;
}

export function scoreFrist(frist: string | null, text: string): number {
  if (frist === null) return 0;
  const matches = [
    /zahlungsfrist/i, /fällig.*am/i, /bis\s+(?:zum|spätestens)/i,
  ].filter(p => p.test(text)).length;
  if (matches >= 1) return 85;
  return 60;
}

export function scoreAbsender(absender: string | null, text: string): number {
  if (!absender || absender === 'Unbekannter Absender') return 20;
  if (/gmbh|ag|kg|e\.v\.|finanzamt|vodafone|telekom|stadtwerke|eon|commerzbank|sparkasse/i.test(absender)) return 90;
  if (absender.length > 10) return 70;
  return 50;
}

export function scoreTyp(typ: string, text: string): number {
  const keywords: Record<string, string[]> = {
    Rechnung:        ['rechnung', 'rechnungsnr', 'mwst', 'gesamtbetrag'],
    Mahnung:         ['mahnung', 'zahlungserinnerung', 'rückstand'],
    Bußgeld:         ['bußgeld', 'ordnungswidrigkeit', 'verwarnungsgeld'],
    Steuerbescheid:  ['steuerbescheid', 'finanzamt', 'einkommensteuer'],
    Kündigung:       ['kündigung', 'kündigt'],
    Termin:          ['termin', 'vorladung'],
    Versicherung:    ['versicherung', 'police', 'versicherungsnehmer'],
    Vertrag:         ['vertrag', 'vertragspartner', 'laufzeit'],
    Behördenbescheid:['bescheid', 'behörde', 'amt'],
    Sonstiges:       [],
  };
  const lower = text.toLowerCase();
  const hits = (keywords[typ] || []).filter(kw => lower.includes(kw)).length;
  if (hits >= 3) return 95;
  if (hits === 2) return 82;
  if (hits === 1) return 68;
  if (typ === 'Sonstiges') return 40;
  return 45;
}
