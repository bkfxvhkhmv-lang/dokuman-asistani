import type { Dokument } from '@/store';
import { formatBetrag, getTageVerbleibend } from '@/utils';

function getSender(dok: Dokument): string | null {
  const value = dok.absender?.trim();
  if (!value) return null;
  if (['unbekannt', 'unbekannter absender', 'unknown', 'unknown sender'].includes(value.toLowerCase())) return null;
  return value;
}

export function buildKurzSatz(dok: Dokument): string {
  const tage = getTageVerbleibend(dok.frist);
  const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) : null;
  const fristStr = dok.frist
    ? new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    : null;

  const absender = getSender(dok);
  const dokTyp = dok.typ || 'Dokument';

  switch (dok.typ) {
    case 'Rechnung':
      if (betragStr && fristStr) return absender ? `${absender} stellt ${betragStr} in Rechnung, fällig am ${fristStr}.` : `Diese Rechnung über ${betragStr} ist am ${fristStr} fällig.`;
      if (betragStr)             return absender ? `Rechnung über ${betragStr} von ${absender}.` : `Diese Rechnung betrifft ${betragStr}.`;
      return                            absender ? `Rechnung von ${absender}.` : 'Dieses Dokument ist eine Rechnung.';

    case 'Mahnung':
      if (betragStr && tage !== null) {
        if (tage < 0) return absender ? `MAHNUNG von ${absender}: ${betragStr} ist bereits überfällig!` : `Mahnung: ${betragStr} ist bereits überfällig!`;
        if (tage <= 3) return absender ? `Dringende Mahnung von ${absender}: ${betragStr} sofort zahlen.` : `Dringende Mahnung: ${betragStr} sofort zahlen.`;
      }
      return betragStr
        ? (absender ? `Mahnung von ${absender} über ${betragStr} — sofort reagieren.` : `Mahnung über ${betragStr} — sofort reagieren.`)
        : (absender ? `Mahnung von ${absender} — sofortiger Handlungsbedarf.` : 'Diese Mahnung erfordert sofortige Reaktion.');

    case 'Bußgeld':
      return betragStr
        ? (absender ? `Bußgeldbescheid von ${absender}: ${betragStr} zahlen oder Einspruch innerhalb 14 Tagen.` : `Bußgeldbescheid: ${betragStr} zahlen oder Einspruch innerhalb 14 Tagen.`)
        : (absender ? `Bußgeldbescheid von ${absender} — Einspruchsoption prüfen.` : 'Bußgeldbescheid — Einspruchsoption prüfen.');

    case 'Steuerbescheid':
      return betragStr
        ? (absender ? `Steuerbescheid von ${absender}: ${betragStr} — Einspruch innerhalb 1 Monat möglich.` : `Steuerbescheid: ${betragStr} — Einspruch innerhalb 1 Monat möglich.`)
        : `Steuerbescheid vom Finanzamt — Prüfung und ggf. Einspruch erforderlich.`;

    case 'Kündigung':
      return fristStr
        ? (absender ? `Kündigung von ${absender} zum ${fristStr} — Fristen und Rechte prüfen.` : `Kündigung zum ${fristStr} — Fristen und Rechte prüfen.`)
        : (absender ? `Kündigungsschreiben von ${absender} — rechtliche Prüfung empfohlen.` : 'Kündigungsschreiben — rechtliche Prüfung empfohlen.');

    case 'Versicherung':
      return absender ? `Versicherungsdokument von ${absender} — Deckung und Laufzeit prüfen.` : 'Versicherungsdokument — Deckung und Laufzeit prüfen.';

    case 'Vertrag':
      return fristStr
        ? (absender ? `Vertrag mit ${absender} — Laufzeit bis ${fristStr}.` : `Dieser Vertrag läuft bis ${fristStr}.`)
        : (absender ? `Vertrag mit ${absender} — Bedingungen und Fristen prüfen.` : 'Dieser Vertrag sollte auf Bedingungen und Fristen geprüft werden.');

    case 'Termin':
      return fristStr
        ? (absender ? `Termin am ${fristStr} bei ${absender} — im Kalender eintragen.` : `Termin am ${fristStr} — im Kalender eintragen.`)
        : (absender ? `Terminbestätigung von ${absender}.` : 'Terminbestätigung.');

    case 'Behördenbescheid':
      return fristStr
        ? (absender ? `Behördenpost von ${absender} — Reaktion bis ${fristStr} erforderlich.` : `Behördenpost — Reaktion bis ${fristStr} erforderlich.`)
        : (absender ? `Offizielles Schreiben von ${absender} — Fristen beachten.` : 'Offizielles Schreiben — Fristen beachten.');

    default:
      if (betragStr && fristStr) return absender ? `${dokTyp} von ${absender}: ${betragStr} bis ${fristStr}.` : `Dieses ${dokTyp.toLowerCase()} betrifft ${betragStr} bis ${fristStr}.`;
      if (betragStr)             return absender ? `${dokTyp} über ${betragStr} von ${absender}.` : `Dieses ${dokTyp.toLowerCase()} betrifft ${betragStr}.`;
      return                            absender ? `${dokTyp} von ${absender}.` : `Dieses Dokument ist vom Typ ${dokTyp}.`;
  }
}
