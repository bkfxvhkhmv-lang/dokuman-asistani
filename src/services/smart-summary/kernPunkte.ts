import type { Dokument } from '@/store';
import { analysiereAllgemeinRisiken } from '@/utils';
import { canOfferPaymentAction, hasCompletePaymentTarget } from '@/utils/documentGuards';

export function buildKernPunkte(dok: Dokument): string[] {
  const punkte: string[] = [];

  const risiken = analysiereAllgemeinRisiken(dok);
  if (risiken.length > 0) {
    punkte.push(risiken[0].text);
  } else if (dok.erledigt) {
    punkte.push('Bereits erledigt');
  } else if (dok.aktionen?.includes('zahlen') && canOfferPaymentAction(dok.betrag)) {
    punkte.push(hasCompletePaymentTarget(dok) ? 'Zahlung vorbereiten' : 'Zahlungsdaten prüfen');
  } else if (dok.aktionen?.includes('einspruch')) {
    punkte.push('Einspruchoption prüfen');
  } else {
    punkte.push('Dokument prüfen und ggf. archivieren');
  }

  return punkte;
}
