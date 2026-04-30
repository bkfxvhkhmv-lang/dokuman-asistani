/**
 * Budget grafik bilesenleri icin paylasilan sabitler ve tipler.
 *
 * TYP_FARBEN ve TYP_IKON merkezilestirildi cunku hem sutun grafik
 * hem de detay listesinde kullaniliyor.
 */

/** Dokumenttipine gore renk eslemesi (chart bar + chip badge'leri). */
export const TYP_FARBEN: Record<string, string> = {
  'Rechnung':       '#6C63FF',
  'Mahnung':        '#FC5C65',
  'Bußgeld':        '#F7B731',
  'Behörde':        '#45AAF2',
  'Steuerbescheid': '#26de81',
  'Versicherung':   '#FD9644',
  'Vertrag':        '#A55EEA',
  'Sonstiges':      '#A5B1C2',
};

/** Dokumenttipine gore emoji ikonu (label + listele yer alir). */
export const TYP_IKON: Record<string, string> = {
  'Rechnung':       '',
  'Mahnung':        '⚠️',
  'Bußgeld':        '🚨',
  'Behörde':        '🏛',
  'Steuerbescheid': '📊',
  'Versicherung':   '🛡️',
  'Vertrag':        '📄',
  'Sonstiges':      '📂',
};

export interface TypGruppe       { typ: string; betrag: number; anzahl: number }
export interface AbsenderGruppe  { ad:  string; betrag: number; anzahl: number }
export interface MonatsGruppe    { monat: number; betrag: number }
