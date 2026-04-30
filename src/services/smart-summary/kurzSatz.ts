import type { Dokument } from '@/store';
import { formatBetrag, getTageVerbleibend } from '@/utils';

export function buildKurzSatz(dok: Dokument): string {
  const tage = getTageVerbleibend(dok.frist);
  const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) : null;
  const fristStr = dok.frist
    ? new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    : null;

  const absender = dok.absender || 'Unbekannt';

  switch (dok.typ) {
    case 'Rechnung':
      if (betragStr && fristStr) return `${absender} stellt ${betragStr} in Rechnung, fällig am ${fristStr}.`;
      if (betragStr)             return `Rechnung über ${betragStr} von ${absender}.`;
      return                            `Rechnung von ${absender}.`;

    case 'Mahnung':
      if (betragStr && tage !== null) {
        if (tage < 0) return `MAHNUNG von ${absender}: ${betragStr} ist bereits überfällig!`;
        if (tage <= 3) return `Dringende Mahnung von ${absender}: ${betragStr} sofort zahlen.`;
      }
      return betragStr
        ? `Mahnung von ${absender} über ${betragStr} — sofort reagieren.`
        : `Mahnung von ${absender} — sofortiger Handlungsbedarf.`;

    case 'Bußgeld':
      return betragStr
        ? `Bußgeldbescheid von ${absender}: ${betragStr} zahlen oder Einspruch innerhalb 14 Tagen.`
        : `Bußgeldbescheid von ${absender} — Einspruchsoption prüfen.`;

    case 'Steuerbescheid':
      return betragStr
        ? `Steuerbescheid von ${absender}: ${betragStr} — Einspruch innerhalb 1 Monat möglich.`
        : `Steuerbescheid vom Finanzamt — Prüfung und ggf. Einspruch erforderlich.`;

    case 'Kündigung':
      return fristStr
        ? `Kündigung von ${absender} zum ${fristStr} — Fristen und Rechte prüfen.`
        : `Kündigungsschreiben von ${absender} — rechtliche Prüfung empfohlen.`;

    case 'Versicherung':
      return `Versicherungsdokument von ${absender} — Deckung und Laufzeit prüfen.`;

    case 'Vertrag':
      return fristStr
        ? `Vertrag mit ${absender} — Laufzeit bis ${fristStr}.`
        : `Vertrag mit ${absender} — Bedingungen und Fristen prüfen.`;

    case 'Termin':
      return fristStr
        ? `Termin am ${fristStr} bei ${absender} — im Kalender eintragen.`
        : `Terminbestätigung von ${absender}.`;

    case 'Behördenbescheid':
      return fristStr
        ? `Behördenpost von ${absender} — Reaktion bis ${fristStr} erforderlich.`
        : `Offizielles Schreiben von ${absender} — Fristen beachten.`;

    default:
      if (betragStr && fristStr) return `${dok.typ} von ${absender}: ${betragStr} bis ${fristStr}.`;
      if (betragStr)             return `${dok.typ} über ${betragStr} von ${absender}.`;
      return                            `${dok.typ} von ${absender}.`;
  }
}
