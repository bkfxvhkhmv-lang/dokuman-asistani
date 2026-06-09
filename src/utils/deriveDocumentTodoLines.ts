import { formatBetrag, formatFrist, getTageVerbleibend } from '@/utils/formatters';
import type { Dokument } from '@/store';

const MAX = 4;

/** Sonuç ekranı — kısa “yapılacaklar” maddeleri (şablon, KI değil) */
export function deriveDocumentTodoLines(dok: Dokument): string[] {
  const out: string[] = [];
  if (dok.erledigt) return out;

  const tage = dok.frist ? getTageVerbleibend(dok.frist) : null;
  if (dok.frist && tage !== null) {
    const rel = tage < 0 ? 'überfällig' : tage === 0 ? 'heute' : tage === 1 ? 'morgen' : `in ${tage} Tagen`;
    if (dok.betrag && dok.betrag > 0 && dok.aktionen?.includes('zahlen')) {
      out.push(`Bis ${formatFrist(dok.frist)} (${rel}): ${formatBetrag(dok.betrag, dok.waehrung || '€')} zahlen`);
    } else {
      out.push(`Frist beachten: ${formatFrist(dok.frist)} (${rel})`);
    }
  } else if (dok.betrag && dok.betrag > 0 && dok.aktionen?.includes('zahlen')) {
    out.push(`Zahlung prüfen: ${formatBetrag(dok.betrag, dok.waehrung || '€')}`);
  }

  if (dok.aktionen?.includes('einspruch') && ['Bußgeld', 'Steuerbescheid', 'Behördenbescheid', 'Mahnung'].includes(dok.typ)) {
    out.push('Einspruchsfrist und Vorlage prüfen');
  }

  if (dok.confidence != null && dok.confidence < 55) {
    out.push('Erkannte Felder kurz gegen Original prüfen');
  }

  if (dok.warnung) {
    out.push('Hinweis im Dokument lesen');
  }

  return out.slice(0, MAX);
}
