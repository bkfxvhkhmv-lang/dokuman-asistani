/**
 * Single source of truth for document-type → visual identity.
 * Used by Home cards, Analyse tab, Aktionen header, and Export screen.
 * All screens must import from here — never duplicate inline.
 */

export type DocumentType =
  | 'mahnung'
  | 'bussgeldbescheid'
  | 'steuerbescheid'
  | 'rechnung'
  | 'versicherung'
  | 'terminbestaetigung'
  | 'vertrag'
  | 'sonstiges';

export interface DocumentTypeUi {
  label: string;
  /** Phosphor icon name */
  icon: string;
  /** Semantic color key — maps to ThemeColors at call-site */
  colorKey: 'danger' | 'warning' | 'primary' | 'success' | 'textSecondary';
}

export const DOCUMENT_TYPE_UI: Record<DocumentType, DocumentTypeUi> = {
  mahnung: {
    label: 'Mahnung',
    icon: 'warning-circle',
    colorKey: 'danger',
  },
  bussgeldbescheid: {
    label: 'Bußgeldbescheid',
    icon: 'seal-warning',
    colorKey: 'danger',
  },
  steuerbescheid: {
    label: 'Steuerbescheid',
    icon: 'bank',
    colorKey: 'warning',
  },
  rechnung: {
    label: 'Rechnung',
    icon: 'receipt',
    colorKey: 'primary',
  },
  versicherung: {
    label: 'Versicherung',
    icon: 'shield-check',
    colorKey: 'success',
  },
  terminbestaetigung: {
    label: 'Terminbestätigung',
    icon: 'calendar-check',
    colorKey: 'success',
  },
  vertrag: {
    label: 'Vertrag',
    icon: 'file-text',
    colorKey: 'primary',
  },
  sonstiges: {
    label: 'Sonstiges',
    icon: 'file',
    colorKey: 'textSecondary',
  },
};

/** Maps the free-text `typ` field stored in Dokument to a canonical DocumentType. */
export function resolveDocumentType(typ: string | null | undefined): DocumentType {
  if (!typ) return 'sonstiges';
  const t = typ.toLowerCase();
  if (/mahnung|inkasso|pfändung|vollstreckung/.test(t))         return 'mahnung';
  if (/bußgeld|bussgeld|bussgeldbescheid|ordnungswidrig/.test(t)) return 'bussgeldbescheid';
  if (/steuer|finanzamt|steuerbescheid/.test(t))                return 'steuerbescheid';
  if (/rechnung|invoice|forderung/.test(t))                     return 'rechnung';
  if (/versicherung/.test(t))                                   return 'versicherung';
  if (/termin|termine|appointment/.test(t))                     return 'terminbestaetigung';
  if (/vertrag|contract/.test(t))                               return 'vertrag';
  return 'sonstiges';
}

/** Returns the UI definition for a raw `typ` string. */
export function getDocumentTypeUi(typ: string | null | undefined): DocumentTypeUi {
  return DOCUMENT_TYPE_UI[resolveDocumentType(typ)];
}
