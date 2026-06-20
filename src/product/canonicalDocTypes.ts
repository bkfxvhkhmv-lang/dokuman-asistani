/**
 * BriefPilot V1 — feste Hauptkategorien (auto + nutzerbearbeitbar).
 * `Dokument.typ` speichert genau diese Strings oder Legacy-Werte werden beim Speichern
 * über `normalizeDocumentTyp()` gemappt.
 */

export const CANONICAL_DOCUMENT_TYPES = [
  'Rechnungen',
  'Mahnung / Zahlungserinnerung',
  'Verträge',
  'Behörden / Amt',
  'Versicherung',
  'Gesundheit',
  'Schule / Kita',
  'Steuer',
  'Bank / Finanzen',
  'Garantie / Kaufbeleg',
  'Sonstiges',
] as const;

export type CanonicalDocumentType = (typeof CANONICAL_DOCUMENT_TYPES)[number];

/**
 * 3 Hauptgruppen + Alle.
 * Rechnungen = Zahlungen; Behörden = amtliche Schreiben; Sonstiges = generische Restgruppe.
 */
export const SEARCH_CATEGORY_QUICK_CHIPS = [
  { filter: 'alle',        label: 'Alle'        },
  { filter: 'Rechnungen',  label: 'Rechnungen'  },
  { filter: 'Behörden',    label: 'Behörden'    },
  { filter: 'Sonstiges',   label: 'Sonstiges'   },
] as const;

/** Bekannte OCR-/Klassifikator-Kürzel → kanonisches `typ`-Label */
const LEGACY_TO_CANONICAL: Record<string, CanonicalDocumentType> = {
  Rechnung: 'Rechnungen',
  Mahnung: 'Mahnung / Zahlungserinnerung',
  Zahlungserinnerung: 'Mahnung / Zahlungserinnerung',
  Vertrag: 'Verträge',
  Kündigung: 'Verträge',
  Behörde: 'Behörden / Amt',
  Bescheid: 'Behörden / Amt',
  Bußgeld: 'Behörden / Amt',
  Termin: 'Behörden / Amt',
  Jobcenter: 'Behörden / Amt',
  Versicherung: 'Versicherung',
  Steuer: 'Steuer',
  Steuerbescheid: 'Steuer',
  Finanzamt: 'Steuer',
  Nebenkostenabrechnung: 'Rechnungen',
  Sonstiges: 'Sonstiges',
};

export function normalizeDocumentTyp(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'Sonstiges';
  const t = raw.trim();
  if ((CANONICAL_DOCUMENT_TYPES as readonly string[]).includes(t)) return t;
  const mapped = LEGACY_TO_CANONICAL[t];
  if (mapped) return mapped;
  return t;
}

/** Feintuning aus Freitext (nach Legacy-Klassifikation). */
export function refineCanonicalTypFromText(
  rawText: string,
  current: string,
): string {
  const school =
    /\b(kita|grundschule|gymnasium|schule|elternbrief|klassenfahr\w*|schulbrief)\b/i;
  if (school.test(rawText)) return 'Schule / Kita';

  const health =
    /\b(krankenkasse|gesetzliche\s+krankenversicherung|aok|barmer|\bdak\b|ikk\b|bek|kvnr|\bgkv\b|techniker\s+krankenkasse|zahnarzt|beitragsbescheid|mitgliedschaft|gesundheit)\b/i;
  if (health.test(rawText)) return 'Gesundheit';

  const bank =
    /\b(kontoauszug|bankauszug|iban|bic|lastschrift|überweisung|paypal|sparkasse|\bn26\b|\brevolut\b)\b/i;
  if (bank.test(rawText) && !/\brechnungsnummer\b/i.test(rawText)) {
    const looksInvoice = /\b(rechnungsnummer|invoice\b|netto|\bsumme\b)\b/i.test(rawText);
    if (!looksInvoice || /\bkontoauszug\b|\bbankauszug\b/i.test(rawText)) return 'Bank / Finanzen';
  }

  const guarantee =
    /\b(garantie|kaufbeleg|kassenbon|garantieschein|rücknahme|rückgabe)\b/i;
  if (guarantee.test(rawText)) return 'Garantie / Kaufbeleg';

  const tax =
    /\b(finanzamt|festsetzungsbescheid|elster|einkommensteuer|rückzahlung.?steuer)\b/i;
  if (tax.test(rawText) && current === 'Versicherung') return 'Steuer';

  // Upgrade weak types when strong deterministic evidence exists.
  // Only runs when the current type carries no meaningful classification.
  const WEAK = new Set(['Sonstiges', 'Dokument', 'Formular', 'Unbekannt', 'unknown']);
  if (WEAK.has(current)) {
    const isReminder =
      /\b(mahnung|zahlungserinnerung|zahlungsaufforderung|mahngeb[uü]hr|mahnstufe|zahlungsverzug)\b/i;
    if (isReminder.test(rawText)) return 'Mahnung / Zahlungserinnerung';

    const isNebenkosten =
      /\b(nebenkostenabrechnung|betriebskostenabrechnung|heizkostenabrechnung|hausgeldabrechnung)\b/i;
    if (isNebenkosten.test(rawText)) return 'Rechnungen';

    const isTaxDoc =
      /\b(steuerbescheid|einkommensteuerbescheid|festsetzungsbescheid|lohnsteuerbescheid|einkommensteuer)\b/i;
    if (isTaxDoc.test(rawText)) return 'Steuer';

    const isFinanzamtDoc =
      /\bfinanzamt\b/i.test(rawText) &&
      !/\b(rechnung|rechnungsnummer|invoice|mahnung|zahlungserinnerung)\b/i.test(rawText);
    if (isFinanzamtDoc) return 'Steuer';

    const isAuthorityDoc =
      /\b(jobcenter|agentur\s+f[uü]r\s+arbeit|verwaltungsbescheid|bu[sß]geldbescheid)\b/i;
    if (isAuthorityDoc.test(rawText)) return 'Behörden / Amt';

    if (/\bbescheid\b/i.test(rawText) && !isTaxDoc.test(rawText)) return 'Behörden / Amt';

    // Invoice: explicit Rechnung keyword or Rechnungsnummer field
    const isInvoice =
      /\b(rechnung|rechnungsnummer|rechnungsdatum|invoice|gesamtsumme|endsumme|nettobetrag)\b/i;
    if (isInvoice.test(rawText)) return 'Rechnungen';

    // Court / judicial document
    const isCourt =
      /\b(amtsgericht|landgericht|oberlandesgericht|verwaltungsgericht|aktenzeichen\s+\d|insolvenzverfahren)\b/i;
    if (isCourt.test(rawText)) return 'Behörden / Amt';

    // German pension / social insurance authority
    const isPension =
      /\b(deutsche\s+rentenversicherung|rentenbezugsbescheinigung|rentenbescheid|drv\s+bund)\b/i;
    if (isPension.test(rawText)) return 'Behörden / Amt';
  }

  return current;
}

export function normalizeAndRefineTyp(legacyClassifierTyp: string, rawText: string): string {
  const base = normalizeDocumentTyp(legacyClassifierTyp);
  return refineCanonicalTypFromText(rawText, base);
}

/** Filter: Chip „Behörden“ matcht Dokument mit altem oder neuem Typ. */
export function documentMatchesTypChip(dokTyp: string | undefined | null, chip: string): boolean {
  const t = dokTyp ?? '';
  if (!chip || chip === 'alle') return true;

  const nDoc = normalizeDocumentTyp(t);

  switch (chip) {
    // ── 3 Hauptgruppen ────────────────────────────────────────────────────
    case 'Rechnungen':
      return ['Rechnungen', 'Rechnung', 'Mahnung / Zahlungserinnerung', 'Mahnung', 'Bank / Finanzen'].includes(t)
        || ['Rechnungen', 'Mahnung / Zahlungserinnerung', 'Bank / Finanzen'].includes(nDoc);
    case 'Behörden':
      return ['Behörde', 'Bußgeld', 'Termin', 'Behörden / Amt', 'Steuer', 'Steuerbescheid', 'Schule / Kita', 'Finanzamt'].includes(t)
        || ['Behörden / Amt', 'Steuer', 'Schule / Kita'].includes(nDoc);
    case 'Sonstiges':
      return ['Sonstiges', 'Dokument', 'Formular', 'Unbekannt', 'unknown'].includes(t)
        || nDoc === 'Sonstiges';
    // ── Legacy einzelne Typen (Filtermodal) ──────────────────────────────
    case 'Behörden / Amt':
      return ['Behörde', 'Bußgeld', 'Termin'].includes(t) || nDoc === 'Behörden / Amt';
    case 'Mahnung / Zahlungserinnerung':
      return nDoc === 'Mahnung / Zahlungserinnerung' || t === 'Mahnung';
    case 'Verträge':
      return ['Vertrag', 'Kündigung', 'Verträge'].includes(t) || nDoc === 'Verträge';
    case 'Steuer':
      return ['Steuer', 'Steuerbescheid'].includes(t) || nDoc === 'Steuer';
    case 'Garantie / Kaufbeleg':
      return nDoc === 'Garantie / Kaufbeleg';
    default:
      return normalizeDocumentTyp(t) === normalizeDocumentTyp(chip) || t === chip;
  }
}
