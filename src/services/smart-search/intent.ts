import type { SearchIntent } from './types';

const INTENT_PATTERNS: { pattern: RegExp; intent: SearchIntent; label: string }[] = [
  { pattern: /(?:zahlen|zahlung|offen|bezahlen|fällig|schulde)/i,          intent: 'zahlung_ausstehend', label: 'Offene Zahlungen' },
  { pattern: /(?:überfällig|zu spät|abgelaufen|verpasst|verspätet)/i,     intent: 'überfällig',         label: 'Überfällige Dokumente' },
  { pattern: /(?:diese woche|diese[rn] woche|nächste tage|bald fällig)/i, intent: 'diese_woche',        label: 'Diese Woche fällig' },
  { pattern: /(?:riskant|gefährlich|dringend|kritisch|hoch.*risiko)/i,    intent: 'risikoreich',         label: 'Risikoreiche Dokumente' },
  { pattern: /(?:aufgaben|was.*tun|was.*machen|todo|erledigen)/i,         intent: 'offene_aufgaben',     label: 'Offene Aufgaben' },
];

const BETRAG_PATTERN = /(?:über|unter|mehr als|weniger als|[\d]+\s*€)/i;
const TYP_PATTERN = /(?:rechnung|mahnung|bußgeld|steuerbescheid|versicherung|vertrag|termin)/i;

export function detectIntent(query: string): { intent: SearchIntent; label: string } {
  const lower = query.toLowerCase().trim();
  for (const { pattern, intent, label } of INTENT_PATTERNS) {
    if (pattern.test(lower)) return { intent, label };
  }
  if (BETRAG_PATTERN.test(lower)) return { intent: 'betrag_filter', label: 'Betragssuche' };
  if (TYP_PATTERN.test(lower))   return { intent: 'typ_filter',    label: 'Typsuche' };
  return { intent: 'freitext', label: 'Freitextsuche' };
}
