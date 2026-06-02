import type { Dokument } from '@/store';
import { getTageVerbleibend } from '@/utils';
import { parseGermanAmount } from '@/services/smart-autofill/invoiceExtractor';
import type { RiskFactor } from './types';

/** Safely resolve dok.betrag to a finite number. Never returns NaN. */
function resolveBetrag(dok: Dokument): number {
  const raw: unknown = dok.betrag;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  // Defensive: betrag arrived as string (e.g. from API or OCR extraction)
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = parseGermanAmount(raw);
    if (parsed !== null) return parsed;
  }
  return 0;
}

export function scoreFristFaktor(dok: Dokument): RiskFactor {
  const tage = getTageVerbleibend(dok.frist);

  if (!dok.frist) return {
    id: 'frist_fehlt', kategorie: 'frist',
    beschreibungKey: 'risk.factor.deadline_missing', gewicht: 10, score: 20,
    icon: '📅',
  };

  if (tage === null) return { id: 'frist_none', kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_none', gewicht: 10, score: 0, icon: '📅' };

  if (tage < 0)   return { id: 'frist_abgelaufen', kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_overdue_days', beschreibungParams: { n: Math.abs(tage) }, gewicht: 30, score: 100, icon: '🚨' };
  if (tage === 0) return { id: 'frist_heute',      kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_today', gewicht: 30, score: 95,  icon: '🔴' };
  if (tage <= 2)  return { id: 'frist_2tage',      kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_in_days', beschreibungParams: { n: tage }, gewicht: 30, score: 90,  icon: '🟠' };
  if (tage <= 7)  return { id: 'frist_woche',      kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_in_days', beschreibungParams: { n: tage }, gewicht: 25, score: 70,  icon: '🟡' };
  if (tage <= 14) return { id: 'frist_2wochen',    kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_in_days', beschreibungParams: { n: tage }, gewicht: 20, score: 45,  icon: '🟢' };
  if (tage <= 30) return { id: 'frist_monat',      kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_in_days', beschreibungParams: { n: tage }, gewicht: 15, score: 20,  icon: '🟢' };
  return                 { id: 'frist_ok',         kategorie: 'frist', beschreibungKey: 'risk.factor.deadline_in_days_safe', beschreibungParams: { n: tage }, gewicht: 10, score: 5,   icon: '✅' };
}

export function scoreBetragFaktor(dok: Dokument): RiskFactor {
  const betrag = resolveBetrag(dok);
  if (betrag === 0) return { id: 'betrag_0', kategorie: 'betrag', beschreibungKey: 'risk.factor.amount_none', gewicht: 8, score: 0, icon: '💶' };

  if (betrag >= 5000) return { id: 'betrag_sehr_hoch', kategorie: 'betrag', beschreibungKey: 'risk.factor.amount_very_high', beschreibungParams: { amount: betrag.toFixed(0) }, gewicht: 20, score: 85, icon: '💸' };
  if (betrag >= 1000) return { id: 'betrag_hoch',      kategorie: 'betrag', beschreibungKey: 'risk.factor.amount_high', beschreibungParams: { amount: betrag.toFixed(0) }, gewicht: 15, score: 65, icon: '💰' };
  if (betrag >= 200)  return { id: 'betrag_mittel',    kategorie: 'betrag', beschreibungKey: 'risk.factor.amount', beschreibungParams: { amount: betrag.toFixed(0) }, gewicht: 10, score: 35, icon: '💶' };
  return                     { id: 'betrag_gering',    kategorie: 'betrag', beschreibungKey: 'risk.factor.amount_low', beschreibungParams: { amount: betrag.toFixed(0) }, gewicht: 5,  score: 10, icon: '💶' };
}

export function scoreTypFaktor(dok: Dokument): RiskFactor {
  const typScores: Record<string, { score: number; beschreibungKey: string }> = {
    Mahnung:         { score: 85, beschreibungKey: 'risk.factor.type.reminder' },
    Bußgeld:         { score: 80, beschreibungKey: 'risk.factor.type.fine' },
    Steuerbescheid:  { score: 65, beschreibungKey: 'risk.factor.type.tax_notice' },
    Behördenbescheid:{ score: 55, beschreibungKey: 'risk.factor.type.authority' },
    Kündigung:       { score: 60, beschreibungKey: 'risk.factor.type.termination' },
    Rechnung:        { score: 30, beschreibungKey: 'risk.factor.type.invoice' },
    Termin:          { score: 25, beschreibungKey: 'risk.factor.type.appointment' },
    Versicherung:    { score: 15, beschreibungKey: 'risk.factor.type.insurance' },
    Vertrag:         { score: 20, beschreibungKey: 'risk.factor.type.contract' },
    Sonstiges:       { score: 10, beschreibungKey: 'risk.factor.type.general' },
  };
  const t = typScores[dok.typ] || { score: 10, beschreibungKey: 'risk.factor.type.generic' };
  return { id: `typ_${dok.typ}`, kategorie: 'typ', ...t, gewicht: 20, icon: '🏷' };
}

export function scoreVollständigkeitFaktor(dok: Dokument): RiskFactor {
  const pflicht: (keyof Dokument)[] = ['absender', 'typ', 'risiko'];
  const wichtig: (keyof Dokument)[] = ['betrag', 'frist', 'zusammenfassung'];
  const fehlendPflicht = pflicht.filter(k => !dok[k] || dok[k] === 'Unbekannter Absender' || dok[k] === 'Sonstiges').length;
  const fehlendWichtig = wichtig.filter(k => !dok[k]).length;

  if (fehlendPflicht >= 2) return { id: 'vollst_schlecht', kategorie: 'vollständigkeit', beschreibungKey: 'risk.factor.complete_missing', gewicht: 15, score: 75, icon: '❓' };
  if (fehlendPflicht === 1 || fehlendWichtig >= 2) return { id: 'vollst_mittel', kategorie: 'vollständigkeit', beschreibungKey: 'risk.factor.complete_partial', gewicht: 12, score: 45, icon: '⚠️' };
  if (fehlendWichtig === 1) return { id: 'vollst_ok', kategorie: 'vollständigkeit', beschreibungKey: 'risk.factor.complete_almost', gewicht: 8, score: 20, icon: '✓' };
  return { id: 'vollst_gut', kategorie: 'vollständigkeit', beschreibungKey: 'risk.factor.complete_all', gewicht: 5, score: 0, icon: '✅' };
}
