import type { Dokument } from '@/store';
import { getTageVerbleibend } from '@/utils';
import type { DarkPattern } from '@/utils';
import type { RiskFactor, RiskLevel } from './types';
import { LEVEL_LABELS } from './labels';

export function buildErklaerung(
  dok: Dokument,
  _score: number,
  level: RiskLevel,
  faktoren: RiskFactor[],
  darkPatterns: DarkPattern[],
): string {
  const tage = getTageVerbleibend(dok.frist);
  const hauptGrund = faktoren.sort((a, b) => (b.score * b.gewicht) - (a.score * a.gewicht))[0];

  let text = `Dieses Dokument (${dok.typ}) hat ein ${LEVEL_LABELS[level].split('—')[0].trim().toLowerCase()} Risiko`;

  if (hauptGrund) text += ` hauptsächlich wegen: ${hauptGrund.beschreibung}`;
  if (tage !== null && tage < 0) text += `. Die Frist ist bereits abgelaufen — sofortiges Handeln erforderlich`;
  else if (tage !== null && tage <= 3) text += `. Nur noch ${tage} Tag${tage !== 1 ? 'e' : ''} bis zur Frist`;
  if (darkPatterns.length > 0) text += `. ${darkPatterns.length} rechtliche Auffälligkeit${darkPatterns.length > 1 ? 'en' : ''} erkannt`;
  if (!text.endsWith('!') && !text.endsWith('?')) text += '.';

  return text;
}
