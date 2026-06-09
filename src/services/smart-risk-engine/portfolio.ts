import type { Dokument } from '@/store';
import type { PortfolioRisk } from './types';
import { scoreToLevel } from './labels';
import { runSmartRiskEngine } from './runEngine';

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
