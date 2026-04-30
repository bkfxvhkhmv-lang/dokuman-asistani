import type { Dokument } from '@/store';
import { formatBetrag, getTageVerbleibend, analysiereAllgemeinRisiken } from '@/utils';

export function buildKernPunkte(dok: Dokument): string[] {
  const tage = getTageVerbleibend(dok.frist);
  const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) : null;
  const fristStr = dok.frist
    ? `${new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}${tage !== null ? ` (${tage < 0 ? `${Math.abs(tage)} Tage überfällig` : tage === 0 ? 'Heute!' : `${tage} Tage`})` : ''}`
    : null;

  const punkte: string[] = [];

  punkte.push(`📄 ${dok.typ} von ${dok.absender || 'Unbekannt'}`);

  const zahlen: string[] = [];
  if (betragStr)              zahlen.push(`Betrag: ${betragStr}`);
  if (fristStr)               zahlen.push(`Frist: ${fristStr}`);
  if ((dok as any).aktenzeichen) zahlen.push(`AZ: ${(dok as any).aktenzeichen}`);
  if (zahlen.length > 0) punkte.push(`💡 ${zahlen.join(' · ')}`);
  else punkte.push(`💡 Kein Betrag oder Frist erkannt`);

  const risiken = analysiereAllgemeinRisiken(dok);
  if (risiken.length > 0) {
    punkte.push(`⚠️ ${risiken[0].text}`);
  } else if (dok.erledigt) {
    punkte.push(`✅ Bereits erledigt`);
  } else if (dok.aktionen?.includes('zahlen')) {
    punkte.push(`💶 Zahlung vorbereiten`);
  } else if (dok.aktionen?.includes('einspruch')) {
    punkte.push(`✍️ Einspruchoption prüfen`);
  } else {
    punkte.push(`📌 Dokument prüfen und ggf. archivieren`);
  }

  return punkte.slice(0, 3);
}
