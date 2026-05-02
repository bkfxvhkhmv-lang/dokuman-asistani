import type { Dokument } from '@/store';
import {
  analysiereAllgemeinRisiken,
  analysiereVertragRisiken,
  erkenneDarkPatterns,
  berechneGesundheitsscore,
} from '@/utils';
import type { RiskEngineResult } from './types';
import { scoreFristFaktor, scoreBetragFaktor, scoreTypFaktor, scoreVollständigkeitFaktor } from './factors';
import { calculateTrend } from './trend';
import { buildReductionSuggestions } from './reductions';
import { buildPeerComparison } from './peerComparison';
import { scoreToLevel, LEVEL_LABELS, TREND_LABELS } from './labels';
import { buildErklaerung } from './explanation';

export function runSmartRiskEngine(dok: Dokument, alleDocs: Dokument[] = []): RiskEngineResult {
  const faktoren = [
    scoreFristFaktor(dok),
    scoreBetragFaktor(dok),
    scoreTypFaktor(dok),
    scoreVollständigkeitFaktor(dok),
  ];

  const allgemeinRisiken = analysiereAllgemeinRisiken(dok);
  const vertragRisiken   = dok.typ === 'Vertrag' ? analysiereVertragRisiken((dok as { rohText?: string }).rohText) : [];
  const darkPatterns     = erkenneDarkPatterns(dok);

  const rechtlichScore = allgemeinRisiken.length * 20 + vertragRisiken.length * 15 + darkPatterns.length * 25;
  if (rechtlichScore > 0) {
    faktoren.push({
      id: 'rechtlich', kategorie: 'rechtlich',
      beschreibung: `${allgemeinRisiken.length + darkPatterns.length} rechtliche Risiken erkannt`,
      gewicht: 25, score: Math.min(100, rechtlichScore), icon: 'gavel',
    });
  }

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
