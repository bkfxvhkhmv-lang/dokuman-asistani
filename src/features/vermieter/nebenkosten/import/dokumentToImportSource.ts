/**
 * D-3.5c-a — Pure mapper: global store Dokument → NkDokumentImportSource
 *
 * No store dependency. Accepts a subset shape matching the global store's
 * Dokument interface so callers can pass `state.dokumente.find(...)` result.
 */

import type { NkDokumentImportSource } from './types';

export interface DokumentLike {
  id: string;
  betrag: number | null;
  waehrung?: string | null;
  absender?: string | null;
  datum?: string | null;
  dokumentDatum?: string | null;
  typ?: string | null;
  subtyp?: string | null;
  rohText?: string | null;
  zusammenfassung?: string | null;
  confidence?: number | null;
}

export function dokumentToImportSource(dok: DokumentLike): NkDokumentImportSource {
  return {
    id: dok.id,
    betrag: dok.betrag,
    waehrung: dok.waehrung ?? null,
    absender: dok.absender ?? null,
    datum: dok.datum ?? null,
    dokumentDatum: dok.dokumentDatum ?? null,
    typ: dok.typ ?? null,
    subtyp: dok.subtyp ?? null,
    rohText: dok.rohText ?? null,
    zusammenfassung: dok.zusammenfassung ?? null,
    confidence: dok.confidence ?? null,
  };
}
