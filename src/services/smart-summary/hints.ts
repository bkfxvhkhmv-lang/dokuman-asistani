import type { Dokument } from '@/store';
import { getTageVerbleibend, analysiereAllgemeinRisiken } from '@/utils';

export function buildRisikoHinweise(dok: Dokument): string[] {
  const risiken = analysiereAllgemeinRisiken(dok);
  return risiken.map(r => `${r.icon} ${r.text}`).slice(0, 3);
}

export function buildHandlungsempfehlungen(dok: Dokument): string[] {
  const empfehlungen: string[] = [];
  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null && tage < 0 && dok.betrag) empfehlungen.push('🚨 Zahlung sofort veranlassen — Frist abgelaufen');
  else if (tage !== null && tage <= 3 && dok.betrag) empfehlungen.push(`💶 Zahlung in ${tage} Tag${tage !== 1 ? 'en' : ''} fällig — jetzt vorbereiten`);
  if (['Bußgeld', 'Steuerbescheid'].includes(dok.typ)) empfehlungen.push('✍️ Einspruchsmöglichkeit innerhalb der Frist prüfen');
  if (dok.typ === 'Mahnung') empfehlungen.push('📞 Kontakt aufnehmen und Ratenzahlung prüfen');
  if (dok.typ === 'Vertrag') empfehlungen.push('📋 Kündigungsfristen und Verlängerungsklauseln prüfen');
  if (!dok.frist && ['Rechnung', 'Mahnung'].includes(dok.typ)) empfehlungen.push('⚠️ Frist manuell prüfen und eintragen');

  return empfehlungen.slice(0, 3);
}
