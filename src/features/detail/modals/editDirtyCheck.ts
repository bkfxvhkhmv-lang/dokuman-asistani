import { normalizeAmountForCompare, normalizeDateForCompare } from '@/utils/germanInputFormat';

export interface EditSnapshot {
  titel: string;
  absender: string;
  betrag: string;
  frist: string;
  dokumentDatum: string;
  iban: string;
  zahlungszweck: string;
  aktenzeichen: string;
  kundennr: string;
  typ: string;
  risiko: string;
  profilId: string | null;
  userOrdner: string;
}

export const EMPTY_EDIT_SNAPSHOT: EditSnapshot = {
  titel: '', absender: '', betrag: '', frist: '', dokumentDatum: '',
  iban: '', zahlungszweck: '', aktenzeichen: '', kundennr: '',
  typ: '', risiko: '', profilId: null, userOrdner: '',
};

function norm(v: string | null | undefined): string {
  return (v ?? '').trim();
}

export function computeEditDirty(current: EditSnapshot, initial: EditSnapshot): boolean {
  return (
    norm(current.titel)          !== norm(initial.titel)          ||
    norm(current.absender)       !== norm(initial.absender)       ||
    normalizeAmountForCompare(current.betrag)         !== normalizeAmountForCompare(initial.betrag)         ||
    normalizeDateForCompare(current.frist)          !== normalizeDateForCompare(initial.frist)          ||
    normalizeDateForCompare(current.dokumentDatum)  !== normalizeDateForCompare(initial.dokumentDatum)  ||
    norm(current.iban)           !== norm(initial.iban)           ||
    norm(current.zahlungszweck)  !== norm(initial.zahlungszweck)  ||
    norm(current.aktenzeichen)   !== norm(initial.aktenzeichen)   ||
    norm(current.kundennr)       !== norm(initial.kundennr)       ||
    norm(current.typ)            !== norm(initial.typ)            ||
    norm(current.risiko)         !== norm(initial.risiko)         ||
    current.profilId             !== initial.profilId             ||
    norm(current.userOrdner)     !== norm(initial.userOrdner)
  );
}
