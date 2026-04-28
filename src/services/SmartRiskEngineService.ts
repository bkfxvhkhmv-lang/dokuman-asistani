/**
 * Smart Risk Engine v2 — V12 Sprint 3
 *
 * Composite risk analysis:
 * - Weighted multi-factor score (0–100)
 * - Risk explanation (WHY is this risky?)
 * - Risk trend (improving / worsening / stable)
 * - Reduction suggestions
 * - Peer comparison (vs. similar docs)
 * - Dark pattern detection (RDG / BGB)
 */

import type { Dokument } from '../store';
import {
  analysiereAllgemeinRisiken,
  analysiereVertragRisiken,
  erkenneDarkPatterns,
  berechneGesundheitsscore,
  getTageVerbleibend,
  type VertragRisiko,
  type DarkPattern,
} from '../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = 'kritisch' | 'hoch' | 'mittel' | 'niedrig' | 'kein';
export type RiskTrend = 'verschlechtert' | 'stabil' | 'verbessert';

export interface RiskFactor {
  id: string;
  kategorie: 'frist' | 'betrag' | 'typ' | 'vollständigkeit' | 'dark_pattern' | 'rechtlich' | 'verhalten';
  beschreibung: string;
  gewicht: number;       // contribution to total score
  score: number;         // 0–100 for this factor
  icon: string;
}

export interface RiskReduction {
  aktion: string;
  beschreibung: string;
  wirkung: string;       // expected score reduction
  dringlichkeit: 'sofort' | 'diese_woche' | 'bald';
  icon: string;
}

export interface PeerComparison {
  aehnlicheDokumente: number;
  durchschnittRisiko: string;
  istSchlechterAlsDurchschnitt: boolean;
  beschreibung: string;
}

export interface RiskEngineResult {
  gesamtScore: number;            // 0–100 (0 = kein Risiko)
  level: RiskLevel;
  levelLabel: string;
  trend: RiskTrend;
  trendLabel: string;
  faktoren: RiskFactor[];
  reduzierungsVorschlaege: RiskReduction[];
  darkPatterns: DarkPattern[];
  allgemeinRisiken: VertragRisiko[];
  peerComparison: PeerComparison | null;
  gesundheitsscore: number;       // existing 0–100 OCR quality metric
  erklaerung: string;             // human-readable summary
}

// ── Risk scoring factors ───────────────────────────────────────────────────────

function scoreFristFaktor(dok: Dokument): RiskFactor {
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

function scoreBetragFaktor(dok: Dokument): RiskFactor {
  const betrag = (dok.betrag as number) || 0;
  if (!dok.betrag || betrag === 0) return { id: 'betrag_0', kategorie: 'betrag', beschreibung: 'Kein Betrag', gewicht: 8, score: 0, icon: '💶' };

  if (betrag >= 5000) return { id: 'betrag_sehr_hoch', kategorie: 'betrag', beschreibung: `Sehr hoher Betrag: ${betrag.toFixed(0)} €`, gewicht: 20, score: 85, icon: '💸' };
  if (betrag >= 1000) return { id: 'betrag_hoch',      kategorie: 'betrag', beschreibung: `Hoher Betrag: ${betrag.toFixed(0)} €`,       gewicht: 15, score: 65, icon: '💰' };
  if (betrag >= 200)  return { id: 'betrag_mittel',    kategorie: 'betrag', beschreibung: `Betrag: ${betrag.toFixed(0)} €`,              gewicht: 10, score: 35, icon: '💶' };
  return                     { id: 'betrag_gering',    kategorie: 'betrag', beschreibung: `Geringer Betrag: ${betrag.toFixed(0)} €`,     gewicht: 5,  score: 10, icon: '💶' };
}

function scoreTypFaktor(dok: Dokument): RiskFactor {
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

function scoreVollständigkeitFaktor(dok: Dokument): RiskFactor {
  const pflicht: (keyof Dokument)[] = ['absender', 'typ', 'risiko'];
  const wichtig: (keyof Dokument)[] = ['betrag', 'frist', 'zusammenfassung'];
  const fehlendPflicht = pflicht.filter(k => !dok[k] || dok[k] === 'Unbekannter Absender' || dok[k] === 'Sonstiges').length;
  const fehlendWichtig = wichtig.filter(k => !dok[k]).length;

  if (fehlendPflicht >= 2) return { id: 'vollst_schlecht', kategorie: 'vollständigkeit', beschreibung: 'Wichtige Felder fehlen', gewicht: 15, score: 75, icon: '❓' };
  if (fehlendPflicht === 1 || fehlendWichtig >= 2) return { id: 'vollst_mittel', kategorie: 'vollständigkeit', beschreibung: 'Einige Felder nicht erkannt', gewicht: 12, score: 45, icon: '⚠️' };
  if (fehlendWichtig === 1) return { id: 'vollst_ok', kategorie: 'vollständigkeit', beschreibung: 'Fast vollständig erfasst', gewicht: 8, score: 20, icon: '✓' };
  return { id: 'vollst_gut', kategorie: 'vollständigkeit', beschreibung: 'Alle wichtigen Felder erkannt', gewicht: 5, score: 0, icon: '✅' };
}

// ── Trend calculation ──────────────────────────────────────────────────────────

function calculateTrend(dok: Dokument, currentScore: number): RiskTrend {
  const tage = getTageVerbleibend(dok.frist);

  // No history available — infer from timing
  if (tage !== null) {
    if (tage < 0)  return 'verschlechtert';  // past deadline
    if (tage <= 3) return 'verschlechtert';  // rapidly approaching
    if (tage > 14) return 'stabil';          // plenty of time
  }
  if (dok.erledigt) return 'verbessert';
  if (currentScore > 70) return 'verschlechtert';
  return 'stabil';
}

// ── Reduction suggestions ─────────────────────────────────────────────────────

function buildReductionSuggestions(
  dok: Dokument,
  faktoren: RiskFactor[],
  darkPatterns: DarkPattern[],
): RiskReduction[] {
  const suggestions: RiskReduction[] = [];
  const tage = getTageVerbleibend(dok.frist);
  const dok2 = dok as any;

  // Frist-based
  if (tage !== null && tage <= 7 && tage >= 0 && dok.betrag) {
    suggestions.push({
      aktion: 'zahlen',
      beschreibung: 'Zahlung sofort ausführen',
      wirkung: '−30 Punkte',
      dringlichkeit: 'sofort',
      icon: '💶',
    });
  }

  // Einspruch window
  if (['Bußgeld', 'Steuerbescheid'].includes(dok.typ) && !dok.erledigt) {
    suggestions.push({
      aktion: 'einspruch',
      beschreibung: 'Einspruch prüfen und ggf. einlegen',
      wirkung: '−25 Punkte wenn berechtigt',
      dringlichkeit: tage !== null && tage <= 5 ? 'sofort' : 'diese_woche',
      icon: '✍️',
    });
  }

  // Vollständigkeit
  const vollFaktor = faktoren.find(f => f.kategorie === 'vollständigkeit');
  if (vollFaktor && vollFaktor.score > 30) {
    suggestions.push({
      aktion: 'bearbeiten',
      beschreibung: 'Fehlende Felder ergänzen (Betrag, Frist)',
      wirkung: '−15 Punkte',
      dringlichkeit: 'bald',
      icon: '✏️',
    });
  }

  // Dark patterns
  if (darkPatterns.length > 0) {
    suggestions.push({
      aktion: 'prüfen',
      beschreibung: `${darkPatterns.length} rechtliche Auffälligkeit${darkPatterns.length > 1 ? 'en' : ''} prüfen`,
      wirkung: '−20 Punkte nach Klärung',
      dringlichkeit: 'diese_woche',
      icon: '⚖️',
    });
  }

  // Erinnerung
  if (dok.frist && !dok.erledigt && tage !== null && tage > 0) {
    const hasReminder = (dok.aufgaben || []).some(a => (a as any).type === 'reminder');
    if (!hasReminder) {
      suggestions.push({
        aktion: 'erinnerung',
        beschreibung: 'Erinnerung einrichten',
        wirkung: '−5 Punkte (proaktive Kontrolle)',
        dringlichkeit: 'bald',
        icon: '🔔',
      });
    }
  }

  return suggestions.slice(0, 4);
}

// ── Peer comparison ────────────────────────────────────────────────────────────

function buildPeerComparison(dok: Dokument, alleDocs: Dokument[]): PeerComparison | null {
  const similar = alleDocs.filter(d => d.id !== dok.id && d.typ === dok.typ && !d.erledigt);
  if (similar.length < 2) return null;

  const risikoMap: Record<string, number> = { hoch: 3, mittel: 2, niedrig: 1 };
  const avgScore = similar.reduce((s, d) => s + (risikoMap[d.risiko] || 1), 0) / similar.length;
  const myScore = risikoMap[dok.risiko] || 1;

  const durchschnittRisiko = avgScore > 2.5 ? 'hoch' : avgScore > 1.5 ? 'mittel' : 'niedrig';
  const istSchlechterAlsDurchschnitt = myScore > avgScore + 0.5;

  return {
    aehnlicheDokumente: similar.length,
    durchschnittRisiko,
    istSchlechterAlsDurchschnitt,
    beschreibung: istSchlechterAlsDurchschnitt
      ? `Risiko höher als bei ${similar.length} ähnlichen Dokumenten (Ø: ${durchschnittRisiko})`
      : `Risiko im normalen Bereich für ${dok.typ}`,
  };
}

// ── Level classification ──────────────────────────────────────────────────────

function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'kritisch';
  if (score >= 60) return 'hoch';
  if (score >= 35) return 'mittel';
  if (score >= 10) return 'niedrig';
  return 'kein';
}

const LEVEL_LABELS: Record<RiskLevel, string> = {
  kritisch: 'Kritisch — sofort handeln',
  hoch:     'Hoch — diese Woche handeln',
  mittel:   'Mittel — bald prüfen',
  niedrig:  'Niedrig — im Blick behalten',
  kein:     'Kein Risiko',
};

const TREND_LABELS: Record<RiskTrend, string> = {
  verschlechtert: '↑ Risiko steigt',
  stabil:         '→ Stabil',
  verbessert:     '↓ Risiko sinkt',
};

// ── Explanation builder ────────────────────────────────────────────────────────

function buildErklaerung(
  dok: Dokument,
  score: number,
  level: RiskLevel,
  faktoren: RiskFactor[],
  darkPatterns: DarkPattern[],
): string {
  const tage = getTageVerbleibend(dok.frist);
  const hauptGrund = faktoren.sort((a, b) => (b.score * b.gewicht) - (a.score * a.gewicht))[0];

  let text = `Dieses Dokument (${dok.typ}) hat ein ${LEVEL_LABELS[level].split('—')[0].trim().toLowerCase()} Risiko`;

  if (hauptGrund) text += ` hauptsächlich wegen: ${hauptGrund.beschreibung.toLowerCase()}`;
  if (tage !== null && tage < 0) text += `. Die Frist ist bereits abgelaufen — sofortiges Handeln erforderlich!`;
  else if (tage !== null && tage <= 3) text += `. Nur noch ${tage} Tag${tage !== 1 ? 'e' : ''} bis zur Frist`;
  if (darkPatterns.length > 0) text += `. ${darkPatterns.length} rechtliche Auffälligkeit${darkPatterns.length > 1 ? 'en' : ''} erkannt`;
  text += '.';

  return text;
}

// ── Main function ─────────────────────────────────────────────────────────────

export function runSmartRiskEngine(dok: Dokument, alleDocs: Dokument[] = []): RiskEngineResult {
  // Build factors
  const faktoren: RiskFactor[] = [
    scoreFristFaktor(dok),
    scoreBetragFaktor(dok),
    scoreTypFaktor(dok),
    scoreVollständigkeitFaktor(dok),
  ];

  // Existing analyses
  const allgemeinRisiken = analysiereAllgemeinRisiken(dok);
  const vertragRisiken   = dok.typ === 'Vertrag' ? analysiereVertragRisiken((dok as any).rohText) : [];
  const darkPatterns     = erkenneDarkPatterns(dok);

  // Legal risk factor
  const rechtlichScore = allgemeinRisiken.length * 20 + vertragRisiken.length * 15 + darkPatterns.length * 25;
  if (rechtlichScore > 0) {
    faktoren.push({
      id: 'rechtlich', kategorie: 'rechtlich',
      beschreibung: `${allgemeinRisiken.length + darkPatterns.length} rechtliche Risiken erkannt`,
      gewicht: 25, score: Math.min(100, rechtlichScore), icon: '⚖️',
    });
  }

  // Weighted composite score
  const totalGewicht = faktoren.reduce((s, f) => s + f.gewicht, 0);
  const gesamtScore = totalGewicht > 0
    ? Math.round(faktoren.reduce((s, f) => s + f.score * f.gewicht, 0) / totalGewicht)
    : 0;

  const level   = scoreToLevel(gesamtScore);
  const trend   = calculateTrend(dok, gesamtScore);
  const gesundheitsscore = berechneGesundheitsscore(dok);

  const reduzierungsVorschlaege = buildReductionSuggestions(dok, faktoren, darkPatterns);
  const peerComparison = alleDocs.length >= 3 ? buildPeerComparison(dok, alleDocs) : null;
  const erklaerung = buildErklaerung(dok, gesamtScore, level, faktoren, darkPatterns);

  return {
    gesamtScore,
    level,
    levelLabel:              LEVEL_LABELS[level],
    trend,
    trendLabel:              TREND_LABELS[trend],
    faktoren,
    reduzierungsVorschlaege,
    darkPatterns,
    allgemeinRisiken:        [...allgemeinRisiken, ...vertragRisiken],
    peerComparison,
    gesundheitsscore,
    erklaerung,
  };
}

// ── Portfolio risk (home screen) ──────────────────────────────────────────────

export interface PortfolioRisk {
  gesamtScore: number;
  level: RiskLevel;
  kritischCount: number;
  hochCount: number;
  mittelCount: number;
  offenBetrag: number;
  topRisikoDokumente: { id: string; titel: string; score: number; level: RiskLevel }[];
}

export function buildPortfolioRisk(docs: Dokument[]): PortfolioRisk {
  const offen = docs.filter(d => !d.erledigt);

  const scored = offen.map(d => {
    const r = runSmartRiskEngine(d);
    return { id: d.id, titel: d.titel, score: r.gesamtScore, level: r.level };
  }).sort((a, b) => b.score - a.score);

  const gesamtScore = scored.length > 0
    ? Math.round(scored.reduce((s, d) => s + d.score, 0) / scored.length)
    : 0;

  const offenBetrag = offen.filter(d => d.betrag)
    .reduce((s, d) => s + ((d.betrag as number) || 0), 0);

  return {
    gesamtScore,
    level: scoreToLevel(gesamtScore),
    kritischCount: scored.filter(d => d.level === 'kritisch').length,
    hochCount:     scored.filter(d => d.level === 'hoch').length,
    mittelCount:   scored.filter(d => d.level === 'mittel').length,
    offenBetrag,
    topRisikoDokumente: scored.slice(0, 5),
  };
}
