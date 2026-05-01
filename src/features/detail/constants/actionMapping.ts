/**
 * Primary action per document type.
 *
 * Rules enforced here:
 *  - "Jetzt bezahlen" is NEVER a primary action — no real payment integration.
 *  - Legal wording uses "prüfen" / "vorbereiten" — never "garantiert" / "einlegen".
 *  - One primary CTA per type, period.
 */
import type { DocumentType } from './documentTypeUi';

export type PrimaryActionId =
  | 'prepare_payment'
  | 'check_objection'
  | 'check_notice'
  | 'check_deadline'
  | 'add_to_calendar'
  | 'check_contract'
  | 'review_summary';

export interface PrimaryAction {
  id: PrimaryActionId;
  /** Button label shown to the user */
  label: string;
  /** Supporting sub-text under the label */
  sublabel: string;
  /** Phosphor icon name */
  icon: string;
}

export const PRIMARY_ACTION_BY_TYPE: Record<DocumentType, PrimaryAction> = {
  mahnung: {
    id: 'prepare_payment',
    label: 'Zahlung vorbereiten',
    sublabel: 'IBAN und Betrag prüfen',
    icon: 'bank',
  },
  bussgeldbescheid: {
    id: 'check_objection',
    label: 'Einspruch prüfen',
    sublabel: 'Frist und Möglichkeiten ansehen',
    icon: 'magnifying-glass',
  },
  steuerbescheid: {
    id: 'check_notice',
    label: 'Bescheid prüfen',
    sublabel: 'Beträge und Einspruchsfrist',
    icon: 'file-search',
  },
  rechnung: {
    id: 'prepare_payment',
    label: 'Zahlung vorbereiten',
    sublabel: 'Empfänger und IBAN prüfen',
    icon: 'bank',
  },
  versicherung: {
    id: 'check_deadline',
    label: 'Frist prüfen',
    sublabel: 'Kündigungsrecht und Fristen',
    icon: 'calendar',
  },
  terminbestaetigung: {
    id: 'add_to_calendar',
    label: 'In Kalender eintragen',
    sublabel: 'Termin nicht verpassen',
    icon: 'calendar-plus',
  },
  vertrag: {
    id: 'check_contract',
    label: 'Vertrag prüfen',
    sublabel: 'Laufzeit und Kündigungsfristen',
    icon: 'file-text',
  },
  sonstiges: {
    id: 'review_summary',
    label: 'Zusammenfassung ansehen',
    sublabel: 'Worum geht es in diesem Brief?',
    icon: 'eye',
  },
};

/** Returns the primary action for a raw `typ` string. */
import { resolveDocumentType } from './documentTypeUi';
export function getPrimaryAction(typ: string | null | undefined): PrimaryAction {
  return PRIMARY_ACTION_BY_TYPE[resolveDocumentType(typ)];
}

/** No-legal-advice disclaimer — always attach to objection/legal actions. */
export const NO_LEGAL_ADVICE_DISCLAIMER =
  'BriefPilot erstellt nur einen Entwurf. Bitte prüfe den Text selbst. Dies ist keine Rechtsberatung.';
