import type { Dokument } from '@/store';
import { formatBetrag, getTageVerbleibend } from '@/utils';

export function buildDailyDigestContent(
  docs: Dokument[],
): { title: string; body: string } | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const offen = docs.filter(d => !d.erledigt);
  if (offen.length === 0) return null;

  const überfällig = offen.filter(d => d.frist && new Date(d.frist) < today);
  const heuteUndMorgen = offen.filter(d => {
    const t = getTageVerbleibend(d.frist);
    return t !== null && t >= 0 && t <= 1;
  });
  const dieseWoche = offen.filter(d => {
    const t = getTageVerbleibend(d.frist);
    return t !== null && t > 1 && t <= 7;
  });
  const hochRisiko = offen.filter(d => d.risiko === 'hoch' && !d.frist);

  if (überfällig.length === 0 && heuteUndMorgen.length === 0 && dieseWoche.length === 0 && hochRisiko.length === 0) {
    return null;
  }

  const parts: string[] = [];
  if (überfällig.length > 0)
    parts.push(`${überfällig.length} überfällig${überfällig.length > 1 ? 'e' : 'es'}`);
  if (heuteUndMorgen.length > 0)
    parts.push(`${heuteUndMorgen.length} heute/morgen fällig`);
  if (dieseWoche.length > 0)
    parts.push(`${dieseWoche.length} diese Woche`);

  const urgentDoc = überfällig[0] ?? heuteUndMorgen[0] ?? dieseWoche[0];
  const totalUrgent = überfällig.length + heuteUndMorgen.length;

  const title = totalUrgent > 0
    ? `Guten Morgen — ${totalUrgent} dringende${totalUrgent > 1 ? '' : 's'} Dokument${totalUrgent > 1 ? 'e' : ''}`
    : `Guten Morgen — ${dieseWoche.length} Frist${dieseWoche.length > 1 ? 'en' : ''} diese Woche`;

  const body = [
    parts.join(', '),
    urgentDoc ? `Dringendster: ${urgentDoc.absender !== 'Unbekannter Absender' ? urgentDoc.absender : urgentDoc.typ}${urgentDoc.betrag ? ` (${formatBetrag(urgentDoc.betrag as number)})` : ''}` : null,
  ].filter(Boolean).join('\n');

  return { title, body };
}
