import { refineCanonicalTypFromText, normalizeAndRefineTyp } from '@/product/canonicalDocTypes';

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

describe('normalizeAndRefineTyp — end-to-end', () => {
  it('Sonstiges + Autodoc invoice → Rechnungen', () => {
    expect(normalizeAndRefineTyp('Sonstiges', 'Autodoc GmbH Facture Bon de sortie Rechnungsnummer 17038456')).toBe('Rechnungen');
  });

  it('Sonstiges + Amtsgericht → Behörden / Amt', () => {
    expect(normalizeAndRefineTyp('Sonstiges', 'Amtsgericht Saarbrücken Aktenzeichen 62 IK')).toBe('Behörden / Amt');
  });
});
