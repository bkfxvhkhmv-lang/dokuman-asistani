import type { Dokument } from '@/store';
import { getTageVerbleibend } from '@/utils';
import type { DarkPattern } from '@/utils';
import type { RiskFactor, RiskLevel } from './types';
import { LEVEL_LABELS } from './labels';
import { getDetailTypeLabel } from '@/constants/docTypeConfig';

function baseRiskSentence(level: RiskLevel): string {
  if (level === 'niedrig') return 'Dieses Dokument wirkt unkritisch.';
  if (level === 'mittel') return 'Dieses Dokument sollte kurz geprüft werden.';
  if (level === 'hoch') return 'Dieses Dokument braucht zeitnahe Aufmerksamkeit.';
  if (level === 'kritisch') return 'Dieses Dokument erfordert sofortiges Handeln.';
  return 'Für dieses Dokument besteht aktuell kein besonderes Risiko.';
}

function describeTopFactor(faktor: RiskFactor | undefined): string | null {
  if (!faktor) return null;
  if (faktor.kategorie === 'betrag') return 'Der Betrag wurde erkannt. Bitte vor Zahlung kurz prüfen.';
  if (faktor.kategorie === 'frist') return 'Bitte Frist und nächsten Schritt kurz prüfen.';
  if (faktor.kategorie === 'vollständigkeit') return 'Einige Angaben sollten kurz ergänzt oder geprüft werden.';
  if (faktor.kategorie === 'dark_pattern' || faktor.kategorie === 'rechtlich') return 'Es gibt Hinweise auf rechtliche Auffälligkeiten. Bitte den Inhalt genau prüfen.';
  return faktor.beschreibung || null;
}

export function buildErklaerung(
  dok: Dokument,
  _score: number,
  level: RiskLevel,
  faktoren: RiskFactor[],
  darkPatterns: DarkPattern[],
): string {
  const tage = getTageVerbleibend(dok.frist);
  const hauptGrund = faktoren.sort((a, b) => (b.score * b.gewicht) - (a.score * a.gewicht))[0];
  const parts: string[] = [];

  if (level === 'niedrig' && dok.betrag != null) {
    parts.push(
      dok.betrag > 0
        ? 'Betrag erkannt. Bitte vor Zahlung kurz prüfen.'
        : 'Betrag erkannt. Bitte kurz prüfen.',
    );
  } else {
    parts.push(baseRiskSentence(level));
  }

  const factorHint = describeTopFactor(hauptGrund);
  if (factorHint && hauptGrund?.kategorie !== 'betrag' && !parts.some(p => p === factorHint)) parts.push(factorHint);

  if (tage !== null && tage < 0) parts.push('Die Frist ist bereits abgelaufen. Bitte jetzt handeln.');
  else if (tage !== null && tage <= 3) parts.push(`Nur noch ${tage} Tag${tage !== 1 ? 'e' : ''} bis zur Frist.`);

  if (darkPatterns.length > 0) {
    parts.push(`${darkPatterns.length} rechtliche Auffälligkeit${darkPatterns.length > 1 ? 'en' : ''} erkannt.`);
  }

  return parts.join(' ');
}
