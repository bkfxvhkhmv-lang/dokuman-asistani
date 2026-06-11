/**
 * D-3.5b — Dokument → NK cost-position import candidate types
 */

export interface NkDokumentImportSource {
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

export interface NkCostPositionImportCandidate {
  sourceDokId: string;
  descriptionDe: string;
  totalCents: number | null;
  currency: string;
  suggestedCategoryKey: string | null;
  suggestedCategoryReasonDe: string | null;
  suggestedIncludeInCalculation: boolean | null;
  needsUserInput: {
    categoryKey: boolean;
    scope: true;
    unitId: true;
    allocationKey: true;
    amount: boolean;
  };
  sourceMeta: {
    absender?: string | null;
    dokumentDatum?: string | null;
    typ?: string | null;
    subtyp?: string | null;
    confidence?: number | null;
  };
}
