import {
  refineCanonicalTypFromText,
  normalizeAndRefineTyp,
  normalizeDocumentTyp,
} from '@/product/canonicalDocTypes';

describe('refineCanonicalTypFromText — weak type upgrade', () => {
  // ── Invoice ────────────────────────────────────────────────────────────────
  it('upgrades Sonstiges → Rechnungen when Rechnung keyword present', () => {
    expect(refineCanonicalTypFromText('Rechnung Nr. 2024-001 Gesamtsumme 128,80 EUR', 'Sonstiges')).toBe('Rechnungen');
  });

  it('upgrades Dokument → Rechnungen on Rechnungsnummer', () => {
    expect(refineCanonicalTypFromText('Rechnungsnummer: 20231533', 'Dokument')).toBe('Rechnungen');
  });

  it('upgrades Unbekannt → Rechnungen on invoice keyword', () => {
    expect(refineCanonicalTypFromText('Invoice Total 78,73 EUR PayPal', 'Unbekannt')).toBe('Rechnungen');
  });

  // ── Reminder / Mahnung ─────────────────────────────────────────────────────
  it('upgrades Sonstiges → Mahnung / Zahlungserinnerung on Zahlungserinnerung', () => {
    expect(
      refineCanonicalTypFromText('Zahlungserinnerung zu Rechnung Nr. 2024-001', 'Sonstiges'),
    ).toBe('Mahnung / Zahlungserinnerung');
  });

  it('prefers Mahnung over Rechnung when both keywords present', () => {
    expect(
      refineCanonicalTypFromText('1. Mahnung Rechnung Nr. 88312 offener Betrag', 'Dokument'),
    ).toBe('Mahnung / Zahlungserinnerung');
  });

  // ── Nebenkosten ────────────────────────────────────────────────────────────
  it('upgrades Sonstiges → Rechnungen on Nebenkostenabrechnung', () => {
    expect(
      refineCanonicalTypFromText('Nebenkostenabrechnung 2025 Nachzahlung 312,40 EUR', 'Sonstiges'),
    ).toBe('Rechnungen');
  });

  // ── Tax / authority ────────────────────────────────────────────────────────
  it('upgrades Sonstiges → Steuer on Einkommensteuerbescheid', () => {
    expect(
      refineCanonicalTypFromText('Finanzamt Köln Einkommensteuerbescheid 2024', 'Sonstiges'),
    ).toBe('Steuer');
  });

  it('upgrades Sonstiges → Steuer on Finanzamt letter without invoice keywords', () => {
    expect(
      refineCanonicalTypFromText('Finanzamt Saarbrücken Mitteilung zur Steuernummer', 'Sonstiges'),
    ).toBe('Steuer');
  });

  it('does not upgrade Rechnung with Finanzamt footer to Steuer', () => {
    expect(
      refineCanonicalTypFromText(
        'Autodoc GmbH Rechnung Nr. 123 Finanzamt Saarlouis SteuerNr 123456789',
        'Sonstiges',
      ),
    ).toBe('Rechnungen');
  });

  it('upgrades Sonstiges → Behörden / Amt on Jobcenter', () => {
    expect(
      refineCanonicalTypFromText('Jobcenter Freiburg Aufforderung zur Unterlagenvorlage', 'Sonstiges'),
    ).toBe('Behörden / Amt');
  });

  it('upgrades Dokument → Behörden / Amt on generic Bescheid', () => {
    expect(
      refineCanonicalTypFromText('Verwaltungsbescheid der Stadt Köln', 'Dokument'),
    ).toBe('Behörden / Amt');
  });

  // ── No upgrade without evidence ────────────────────────────────────────────
  it('keeps Sonstiges when no classification evidence', () => {
    expect(refineCanonicalTypFromText('Allgemeines Schreiben ohne Typ-Hinweis', 'Sonstiges')).toBe('Sonstiges');
  });

  // ── Court / government ─────────────────────────────────────────────────────
  it('upgrades Sonstiges → Behörden / Amt on Amtsgericht', () => {
    expect(refineCanonicalTypFromText('Amtsgericht Saarbrücken Aktenzeichen 62 IK 64/09', 'Sonstiges')).toBe('Behörden / Amt');
  });

  it('upgrades Dokument → Behörden / Amt on Insolvenzverfahren', () => {
    expect(refineCanonicalTypFromText('Insolvenzverfahren Bayram Gül Zerrstraße 13', 'Dokument')).toBe('Behörden / Amt');
  });

  // ── DRV / pension ──────────────────────────────────────────────────────────
  it('upgrades Sonstiges → Behörden / Amt on Deutsche Rentenversicherung', () => {
    expect(refineCanonicalTypFromText('Deutsche Rentenversicherung Bund Rentenbezugsbescheinigung', 'Sonstiges')).toBe('Behörden / Amt');
  });

  it('upgrades Dokument → Behörden / Amt on DRV Bund', () => {
    expect(refineCanonicalTypFromText('DRV Bund Hauptverwaltung Berlin', 'Dokument')).toBe('Behörden / Amt');
  });

  // ── Strong types must not be overwritten ───────────────────────────────────
  it('does not overwrite Rechnungen with court pattern', () => {
    expect(refineCanonicalTypFromText('Amtsgericht Rechnung gerichtlich', 'Rechnungen')).toBe('Rechnungen');
  });

  it('does not overwrite Gesundheit with invoice keyword', () => {
    expect(refineCanonicalTypFromText('Rechnung AOK Krankenkasse', 'Gesundheit')).toBe('Gesundheit');
  });

  it('does not overwrite Verträge with weak evidence', () => {
    expect(refineCanonicalTypFromText('Rechnungsdatum Vertrag', 'Verträge')).toBe('Verträge');
  });
});

describe('normalizeDocumentTyp — legacy OCR labels', () => {
  it('maps Zahlungserinnerung to Mahnung / Zahlungserinnerung', () => {
    expect(normalizeDocumentTyp('Zahlungserinnerung')).toBe('Mahnung / Zahlungserinnerung');
  });

  it('maps Nebenkostenabrechnung to Rechnungen', () => {
    expect(normalizeDocumentTyp('Nebenkostenabrechnung')).toBe('Rechnungen');
  });

  it('maps Jobcenter to Behörden / Amt', () => {
    expect(normalizeDocumentTyp('Jobcenter')).toBe('Behörden / Amt');
  });
});

describe('normalizeAndRefineTyp — end-to-end', () => {
  it('Sonstiges + Autodoc invoice → Rechnungen', () => {
    expect(normalizeAndRefineTyp('Sonstiges', 'Autodoc GmbH Facture Bon de sortie Rechnungsnummer 17038456')).toBe('Rechnungen');
  });

  it('Sonstiges + Amtsgericht → Behörden / Amt', () => {
    expect(normalizeAndRefineTyp('Sonstiges', 'Amtsgericht Saarbrücken Aktenzeichen 62 IK')).toBe('Behörden / Amt');
  });
});
