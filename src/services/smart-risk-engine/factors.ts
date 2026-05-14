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
    beschreibung: 'Keine Frist erkannt', gewicht: 10, score: 20,
    icon: '📅',
  };

  if (tage === null) return { id: 'frist_none', kategorie: 'frist', beschreibung: 'Kein Fälligkeitsdatum', gewicht: 10, score: 0, icon: '📅' };

  if (tage < 0)   return { id: 'frist_abgelaufen', kategorie: 'frist', beschreibung: `Frist seit ${Math.abs(tage)} Tagen abgelaufen`, gewicht: 30, score: 100, icon: '🚨' };
  if (tage === 0) return { id: 'frist_heute',      kategorie: 'frist', beschreibung: 'Frist heute!',                                    gewicht: 30, score: 95,  icon: '🔴' };
  if (tage <= 2)  return { id: 'frist_2tage',      kategorie: 'frist', beschreibung: `Frist in ${tage} Tag${tage > 1 ? 'en' : ''}`,    gewicht: 30, score: 90,  icon: '🟠' };
  if (tage <= 7)  return { id: 'frist_woche',      kategorie: 'frist', beschreibung: `Frist in ${tage} Tagen`,                          gewicht: 25, score: 70,  icon: '🟡' };
  if (tage <= 14) return { id: 'frist_2wochen',    kategorie: 'frist', beschreibung: `Frist in ${tage} Tagen`,                          gewicht: 20, score: 45,  icon: '🟢' };
  if (tage <= 30) return { id: 'frist_monat',      kategorie: 'frist', beschreibung: `Frist in ${tage} Tagen`,                          gewicht: 15, score: 20,  icon: '🟢' };
  return                 { id: 'frist_ok',         kategorie: 'frist', beschreibung: `Frist in ${tage} Tagen — ausreichend Zeit`,        gewicht: 10, score: 5,   icon: '✅' };
}

export function scoreBetragFaktor(dok: Dokument): RiskFactor {
  const betrag = resolveBetrag(dok);
  if (betrag === 0) return { id: 'betrag_0', kategorie: 'betrag', beschreibung: 'Kein Betrag', gewicht: 8, score: 0, icon: '💶' };

  if (betrag >= 5000) return { id: 'betrag_sehr_hoch', kategorie: 'betrag', beschreibung: `Sehr hoher Betrag: ${betrag.toFixed(0)} €`, gewicht: 20, score: 85, icon: '💸' };
  if (betrag >= 1000) return { id: 'betrag_hoch',      kategorie: 'betrag', beschreibung: `Hoher Betrag: ${betrag.toFixed(0)} €`,       gewicht: 15, score: 65, icon: '💰' };
  if (betrag >= 200)  return { id: 'betrag_mittel',    kategorie: 'betrag', beschreibung: `Betrag: ${betrag.toFixed(0)} €`,              gewicht: 10, score: 35, icon: '💶' };
  return                     { id: 'betrag_gering',    kategorie: 'betrag', beschreibung: `Geringer Betrag: ${betrag.toFixed(0)} €`,     gewicht: 5,  score: 10, icon: '💶' };
}

export function scoreTypFaktor(dok: Dokument): RiskFactor {
  const typScores: Record<string, { score: number; beschreibung: string }> = {
    Mahnung:         { score: 85, beschreibung: 'Mahnung — Vollstreckung möglich' },
    Bußgeld:         { score: 80, beschreibung: 'Bußgeld — Einspruchsfrist läuft' },
    Steuerbescheid:  { score: 65, beschreibung: 'Steuerbescheid — Prüfung empfohlen' },
    Behördenbescheid:{ score: 55, beschreibung: 'Behördenpost — Fristen beachten' },
    Kündigung:       { score: 60, beschreibung: 'Kündigung — Rechte prüfen' },
    Rechnung:        { score: 30, beschreibung: 'Rechnung — Zahlung erforderlich' },
    Termin:          { score: 25, beschreibung: 'Termin — im Kalender eintragen' },
    Versicherung:    { score: 15, beschreibung: 'Versicherung — Deckung prüfen' },
    Vertrag:         { score: 20, beschreibung: 'Vertrag — Laufzeit beachten' },
    Sonstiges:       { score: 10, beschreibung: 'Allgemeines Schreiben' },
  };
  const t = typScores[dok.typ] || { score: 10, beschreibung: dok.typ };
  return { id: `typ_${dok.typ}`, kategorie: 'typ', ...t, gewicht: 20, icon: '🏷' };
}

export function scoreVollständigkeitFaktor(dok: Dokument): RiskFactor {
  const pflicht: (keyof Dokument)[] = ['absender', 'typ', 'risiko'];
  const wichtig: (keyof Dokument)[] = ['betrag', 'frist', 'zusammenfassung'];
  const fehlendPflicht = pflicht.filter(k => !dok[k] || dok[k] === 'Unbekannter Absender' || dok[k] === 'Sonstiges').length;
  const fehlendWichtig = wichtig.filter(k => !dok[k]).length;

  if (fehlendPflicht >= 2) return { id: 'vollst_schlecht', kategorie: 'vollständigkeit', beschreibung: 'Wichtige Felder fehlen', gewicht: 15, score: 75, icon: '❓' };
  if (fehlendPflicht === 1 || fehlendWichtig >= 2) return { id: 'vollst_mittel', kategorie: 'vollständigkeit', beschreibung: 'Einige Felder nicht erkannt', gewicht: 12, score: 45, icon: '⚠️' };
  if (fehlendWichtig === 1) return { id: 'vollst_ok', kategorie: 'vollständigkeit', beschreibung: 'Fast vollständig erfasst', gewicht: 8, score: 20, icon: '✓' };
  return { id: 'vollst_gut', kategorie: 'vollständigkeit', beschreibung: 'Alle wichtigen Felder erkannt', gewicht: 5, score: 0, icon: '✅' };
}
