/**
 * Çoklu sinyalli sınıflandırma: ana tip, alt tip, güven, kurum, alternatifler.
 */
import type { DocumentAnalysis } from '@/services/visionApi';

import { HATIRLATMA, TYPE_KEYWORDS } from './constants';
import { detectSubtyp } from './detectSubtyp';
import { matchInstitution } from './institutionMatch';
import type { CategoryAlt, CategoryResult } from './types';

export function runSmartCategorization(
  visionResult: DocumentAnalysis,
  rohText: string,
): CategoryResult {
  const lower = rohText.toLowerCase();
  const absender = visionResult.absender;

  const typeScores: { typ: string; score: number; signale: CategoryResult['signale'] }[] = [];

  for (const [typ, groups] of Object.entries(TYPE_KEYWORDS)) {
    let score = 0;
    const signale: CategoryResult['signale'] = [];
    for (const { words, weight } of groups) {
      const hits = words.filter(w => lower.includes(w));
      if (hits.length > 0) {
        score += weight;
        signale.push({ quelle: 'keyword', beschreibung: `"${hits[0]}" gefunden`, gewicht: weight });
      }
    }
    typeScores.push({ typ, score, signale });
  }

  const instMatch = matchInstitution(rohText, absender);
  if (instMatch) {
    const existing = typeScores.find(t => t.typ === instMatch.typ);
    if (existing) {
      existing.score += 30;
      existing.signale.push({ quelle: 'institution_db', beschreibung: `Bekannte Institution: ${instMatch.name}`, gewicht: 30 });
    }
  }

  if (absender && absender !== 'Unbekannter Absender') {
    const absLower = absender.toLowerCase();
    const absSignals: [RegExp, string, string][] = [
      [/finanzamt/i, 'Steuerbescheid', `Absender enthält "Finanzamt"`],
      [/mahnung|inkasso/i, 'Mahnung', `Absender enthält "Mahnung"`],
      [/versicherung/i, 'Versicherung', `Absender ist Versicherung`],
    ];
    for (const [p, typ, desc] of absSignals) {
      if (p.test(absLower)) {
        const t = typeScores.find(x => x.typ === typ);
        if (t) { t.score += 20; t.signale.push({ quelle: 'absender', beschreibung: desc, gewicht: 20 }); }
      }
    }
  }

  typeScores.sort((a, b) => b.score - a.score);

  const best = typeScores[0];
  const winner = best.score > 0 ? best.typ : (visionResult.typ !== 'Sonstiges' ? visionResult.typ : 'Sonstiges');
  const winnerScore = best.score;

  const maxPossible = 100;
  const confidence = Math.min(100, Math.round((winnerScore / maxPossible) * 100));

  const subtyp = detectSubtyp(winner, rohText, absender);

  const alternatives: CategoryAlt[] = typeScores
    .slice(1, 4)
    .filter(t => t.score > 10)
    .map(t => ({
      typ:    t.typ,
      subtyp: detectSubtyp(t.typ, rohText, absender),
      score:  Math.min(100, Math.round((t.score / maxPossible) * 100)),
    }));

  if (instMatch && instMatch.typ !== winner) {
    instMatch.confidence = Math.max(60, confidence - 10);
  }

  return {
    typ:         winner,
    subtyp,
    confidence,
    alternatives,
    signale:     best.signale,
    institution: instMatch,
    hatirlatma:  HATIRLATMA[winner] ?? null,
  };
}
