import type { Dokument } from '@/store';
import type { AutoFillResult, ExtractedFields } from './types';

export function mergeAutoFillIntoDokument(
  result: AutoFillResult,
  userEdits: Partial<ExtractedFields>,
): Partial<Dokument> {
  const base = { ...result.extracted, ...userEdits };
  return {
    titel:         base.titel ?? base.typ,
    typ:           base.typ,
    absender:      base.absender ?? 'Unbekannter Absender',
    betrag:        base.betrag ?? undefined,
    frist:         base.frist ?? undefined,
    risiko:        base.risiko,
    aktionen:      base.aktionen,
    ...(base.iban          ? { iban: base.iban }                     : {}),
    ...(base.aktenzeichen  ? { aktenzeichen: base.aktenzeichen }     : {}),
    ...(base.kundennr      ? { kundennr: base.kundennr }             : {}),
    ...(base.rechnungsnr   ? { rechnungsnr: base.rechnungsnr }       : {}),
    ...(base.vertragsnr    ? { vertragsnr: base.vertragsnr }         : {}),
    ...(base.zahlungszweck ? { zahlungszweck: base.zahlungszweck }   : {}),
    ...(base.steuerid      ? { steuerid: base.steuerid }             : {}),
  };
}
