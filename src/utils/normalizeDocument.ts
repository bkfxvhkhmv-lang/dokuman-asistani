import type { Dokument } from '@/store';
import type {
  NormalizedDocument,
  NormalizedDocumentType,
  NormalizedNextStep,
  FieldConfidence,
} from '@/types/normalizedDocument';
import { inferAmountSemantics } from '@/utils/documentGuards';
import { resolveDocumentType } from '@/features/detail/constants/documentTypeUi';

// Maps the app's internal DocumentType to NormalizedDocumentType.
const DOCTYPE_MAP: Record<string, NormalizedDocumentType> = {
  mahnung:           'reminder',
  bussgeldbescheid:  'notice',
  steuerbescheid:    'notice',
  rechnung:          'invoice',
  versicherung:      'insurance',
  terminbestaetigung:'letter',
  vertrag:           'contract',
  sonstiges:         'unknown',
};

function betragConfidence(dok: Dokument): FieldConfidence {
  if (dok.betrag == null) return 'unknown';
  // OCR confidence correlates with field reliability; treat high confidence as inferred.
  if ((dok.confidence ?? 0) >= 0.8) return 'inferred';
  return 'fallback';
}

function minimalNextStep(dok: Dokument): NormalizedNextStep | undefined {
  const semantics = inferAmountSemantics(dok.betrag);
  if (semantics === 'credit')  return { action: 'check_credit', label: 'Gutschrift prüfen' };
  if (semantics === 'payable') return { action: 'pay',          label: 'Zahlung vorbereiten' };
  return undefined;
}

/**
 * Produces a read-only normalized view model from a Dokument.
 * Does NOT write to the store. Does NOT format values for display.
 * Call sites can use this in selectors / derived state.
 *
 * Key date semantics:
 *   dok.datum        = scan date  → scanDate
 *   dok.dokumentDatum = document date on the paper → documentDate
 */
export function normalizeDokumentForDisplay(dok: Dokument): NormalizedDocument {
  const resolvedType = resolveDocumentType(dok.typ);
  const normalizedType: NormalizedDocumentType = DOCTYPE_MAP[resolvedType] ?? 'unknown';

  const refNumber = dok.aktenzeichen ?? dok.rechnungsnr ?? dok.vertragsnr ?? null;

  const warnings = dok.warnung
    ? [{ type: 'document_warning', message: dok.warnung, severity: 'warning' as const }]
    : [];

  return {
    documentType: {
      value:      normalizedType,
      confidence: normalizedType !== 'unknown' ? 'inferred' : 'unknown',
      source:     'llm',
    },

    sender: {
      value:      dok.absender || null,
      confidence: dok.absender ? 'inferred' : 'unknown',
      source:     'llm',
    },

    // dok.dokumentDatum is the date written on the document.
    // dok.datum is the scan date and must NOT fill documentDate.
    documentDate: {
      value:      dok.dokumentDatum ?? null,
      confidence: dok.dokumentDatum ? 'inferred' : 'unknown',
      source:     'ocr',
    },

    scanDate: dok.datum ?? undefined,

    amount: {
      value:      dok.betrag ?? null,
      currency:   dok.waehrung || '€',
      semantics:  inferAmountSemantics(dok.betrag),
      confidence: betragConfidence(dok),
      source:     'ocr',
    },

    dueDate: {
      value:      dok.frist ?? null,
      confidence: dok.frist ? 'inferred' : 'unknown',
      source:     'llm',
    },

    referenceNumber: {
      value:      refNumber,
      confidence: refNumber ? 'inferred' : 'unknown',
      source:     'ocr',
    },

    customerName: dok.kontaktName
      ? { value: dok.kontaktName, confidence: 'inferred', source: 'llm' }
      : undefined,

    fields:  [],
    rawText: dok.rohText ?? null,
    warnings,

    nextStep: minimalNextStep(dok),
  };
}
