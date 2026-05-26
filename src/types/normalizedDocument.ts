/**
 * Canonical type definitions for the normalized document model.
 *
 * These types describe the target representation for any document
 * processed by BriefPilot. They define the shared language between
 * OCR extraction, LLM inference, and UI display layers.
 *
 * Runtime wiring is done separately (adapter / selectors).
 * This file contains no logic.
 */

export type FieldConfidence =
  | 'verified'   // confirmed by multiple signals or user
  | 'inferred'   // derived from context, not explicit OCR text
  | 'fallback'   // default applied when extraction failed
  | 'unknown'    // no extraction attempted
  | 'conflict';  // multiple contradictory extractions

export type AmountSemantics = 'payable' | 'credit' | 'unknown';

export type NormalizedDocumentType =
  | 'invoice'
  | 'letter'
  | 'form'
  | 'insurance'
  | 'contract'
  | 'notice'
  | 'reminder'
  | 'unknown';

export interface NormalizedValue<T> {
  value: T | null;
  confidence: FieldConfidence;
  source?: 'ocr' | 'llm' | 'user' | 'fallback' | 'derived';
}

export interface NormalizedField {
  key: string;
  label: string;
  value: string;
  confidence: FieldConfidence;
  source?: 'ocr' | 'llm' | 'user' | 'fallback' | 'derived';
  group?: 'important' | 'payment' | 'contact' | 'contract' | 'other';
}

export interface NormalizedWarning {
  type: string;
  message: string;
  field?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface NormalizedNextStep {
  action:
    | 'review'
    | 'pay'
    | 'check_credit'
    | 'respond'
    | 'set_deadline'
    | 'file'
    | 'export'
    | 'none';
  label: string;
  hint?: string;
  urgency?: 'overdue' | 'today' | 'this_week' | 'later' | 'none';
}

export interface NormalizedDocument {
  documentType: NormalizedValue<NormalizedDocumentType>;
  sender: NormalizedValue<string>;
  documentDate: NormalizedValue<string>;
  scanDate?: string;

  amount: NormalizedValue<number> & {
    currency?: string;
    semantics: AmountSemantics;
  };

  dueDate: NormalizedValue<string>;
  referenceNumber: NormalizedValue<string>;
  customerName?: NormalizedValue<string>;

  fields: NormalizedField[];
  rawText?: string | null;
  warnings: NormalizedWarning[];
  nextStep?: NormalizedNextStep;
}
