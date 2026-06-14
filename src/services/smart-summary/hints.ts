import type { Dokument } from '@/store';
import { getTageVerbleibend, analysiereAllgemeinRisiken } from '@/utils';
import { canOfferPaymentAction } from '@/utils/documentGuards';

export function buildRisikoHinweise(dok: Dokument): string[] {
  const risiken = analysiereAllgemeinRisiken(dok);
  return risiken.map(r => r.text).slice(0, 3);
}

export function buildHandlungsempfehlungen(dok: Dokument): string[] {
  const empfehlungen: string[] = [];
  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null && tage < 0 && canOfferPaymentAction(dok.betrag)) empfehlungen.push('Frist abgelaufen — Zahlung zeitnah prüfen');
  else if (tage !== null && tage <= 3 && canOfferPaymentAction(dok.betrag)) empfehlungen.push(`Zahlung in ${tage} Tag${tage !== 1 ? 'en' : ''} fällig`);
  if (['Bußgeld', 'Steuerbescheid'].includes(dok.typ)) empfehlungen.push('Einspruchsfrist prüfen');
  if (dok.typ === 'Mahnung') empfehlungen.push('Ratenzahlung prüfen');
  if (dok.typ === 'Vertrag') empfehlungen.push('Kündigungsfristen prüfen');
  if (!dok.frist && ['Rechnung', 'Mahnung'].includes(dok.typ)) empfehlungen.push('Frist fehlt — bitte eintragen');

  return empfehlungen.slice(0, 3);
}
