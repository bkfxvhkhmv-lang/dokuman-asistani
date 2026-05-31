import type { Dokument } from '@/store';
import { formatBetrag, getTageVerbleibend, analysiereAllgemeinRisiken } from '@/utils';
import { canOfferPaymentAction } from '@/utils/documentGuards';

function getSender(dok: Dokument): string | null {
  const value = dok.absender?.trim();
  if (!value) return null;
  if (['unbekannt', 'unbekannter absender', 'unknown', 'unknown sender'].includes(value.toLowerCase())) return null;
  return value;
}

export function buildKernPunkte(dok: Dokument): string[] {
  const tage = getTageVerbleibend(dok.frist);
  const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) : null;
  const fristStr = dok.frist
    ? `${new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}${tage !== null ? ` (${tage < 0 ? `${Math.abs(tage)} Tage überfällig` : tage === 0 ? 'Heute!' : `${tage} Tage`})` : ''}`
    : null;

  const punkte: string[] = [];
  const absender = getSender(dok);

  punkte.push(absender ? `📄 ${dok.typ} von ${absender}` : `📄 ${dok.typ}`);

  const zahlen: string[] = [];
  if (betragStr)              zahlen.push(`Betrag: ${betragStr}`);
  if (fristStr)               zahlen.push(`Frist: ${fristStr}`);
  if ((dok as any).aktenzeichen) zahlen.push(`AZ: ${(dok as any).aktenzeichen}`);
  if (zahlen.length > 0) punkte.push(`💡 ${zahlen.join(' · ')}`);
  else if (dok.typ === 'Rechnung' || dok.typ === 'Mahnung' || dok.typ === 'Bußgeld') {
    if (dok.frist) punkte.push(`💡 Betrag nicht erkannt · Frist: ${fristStr}`);
    else punkte.push('💡 Betrag nicht erkannt');
  } else if (dok.frist) {
    punkte.push(`💡 Frist: ${fristStr}`);
  } else {
    punkte.push('💡 Wichtige Angaben nicht erkannt');
  }

  const risiken = analysiereAllgemeinRisiken(dok);
  if (risiken.length > 0) {
    punkte.push(`⚠️ ${risiken[0].text}`);
  } else if (dok.erledigt) {
    punkte.push(`✅ Bereits erledigt`);
  } else if (dok.aktionen?.includes('zahlen') && canOfferPaymentAction(dok.betrag)) {
    punkte.push(`💶 Zahlung vorbereiten`);
  } else if (dok.aktionen?.includes('einspruch')) {
    punkte.push(`✍️ Einspruchoption prüfen`);
  } else {
    punkte.push(`📌 Dokument prüfen und ggf. archivieren`);
  }

  return punkte.slice(0, 3);
}
