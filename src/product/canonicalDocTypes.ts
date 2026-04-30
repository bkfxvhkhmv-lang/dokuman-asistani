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

/** Filter-Chips unter der Suche (key = Dokument.typ oder Alle). */
export const SEARCH_CATEGORY_QUICK_CHIPS = [
  { filter: 'alle', label: 'Alle' },
  { filter: 'Rechnungen', label: 'Rechnungen' },
  { filter: 'Behörden / Amt', label: 'Behörden' },
  { filter: 'Steuer', label: 'Steuer' },
  { filter: 'Garantie / Kaufbeleg', label: 'Garantie' },
  { filter: 'Versicherung', label: 'Versicherung' },
  { filter: 'Gesundheit', label: 'Gesundheit' },
] as const;

/** Bekannte OCR-/Klassifikator-Kürzel → kanonisches `typ`-Label */
const LEGACY_TO_CANONICAL: Record<string, CanonicalDocumentType> = {
  Rechnung: 'Rechnungen',
  Mahnung: 'Mahnung / Zahlungserinnerung',
  Vertrag: 'Verträge',
  Kündigung: 'Verträge',
  Behörde: 'Behörden / Amt',
  Bußgeld: 'Behörden / Amt',
  Termin: 'Behörden / Amt',
  Versicherung: 'Versicherung',
  Steuer: 'Steuer',
  Steuerbescheid: 'Steuer',
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
    case 'Rechnungen':
      return ['Rechnungen', 'Rechnung'].includes(t) || nDoc === 'Rechnungen';
    case 'Mahnung / Zahlungserinnerung':
      return nDoc === 'Mahnung / Zahlungserinnerung' || t === 'Mahnung';
    case 'Verträge':
      return ['Vertrag', 'Kündigung', 'Verträge'].includes(t) || nDoc === 'Verträge';
    case 'Behörden / Amt':
      return ['Behörde', 'Bußgeld', 'Termin'].includes(t) || nDoc === 'Behörden / Amt';
    case 'Steuer':
      return ['Steuer', 'Steuerbescheid'].includes(t) || nDoc === 'Steuer';
    case 'Garantie / Kaufbeleg':
      return nDoc === 'Garantie / Kaufbeleg';
    default:
      return normalizeDocumentTyp(t) === normalizeDocumentTyp(chip) || t === chip;
  }
}
