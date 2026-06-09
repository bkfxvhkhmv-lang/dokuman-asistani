import { getDetailTypeLabel, resolveDisplayDocumentType } from '@/constants/docTypeConfig';

describe('getDetailTypeLabel — Formular medical referral refinement', () => {
  it('Formular + rohText contains MRT + Überweisung => MRT-Überweisung', () => {
    const rohText = 'Überweisungsschein\nMRT Lendenwirbelsäule\nDiagnose: Rückenschmerzen\nRadiologie Praxis';
    expect(getDetailTypeLabel('Formular', rohText)).toBe('MRT-Überweisung');
  });

  it('Formular + rohText contains MRT Überweisung (no Umlaut) => MRT-Überweisung', () => {
    const rohText = 'MRT Uberweisung\nFacharzt für Radiologie';
    expect(getDetailTypeLabel('Formular', rohText)).toBe('MRT-Überweisung');
  });

  it('Formular + rohText contains Überweisungsschein (no MRT) => Überweisung', () => {
    const rohText = 'Überweisungsschein\nFacharzt für Orthopädie\nDiagnose: Knieschmerz';
    expect(getDetailTypeLabel('Formular', rohText)).toBe('Überweisung');
  });

  it('Formular + rohText contains Überweisung (no MRT) => Überweisung', () => {
    const rohText = 'Hausarzt überweist an Facharzt\nÜberweisung gültig bis 30.06.2026';
    expect(getDetailTypeLabel('Formular', rohText)).toBe('Überweisung');
  });

  it('Formular + unrelated rohText => Formular', () => {
    const rohText = 'Antrag auf Sozialleistungen\nBitte ausfüllen und zurücksenden';
    expect(getDetailTypeLabel('Formular', rohText)).toBe('Formular');
  });

  it('Formular + no rohText => Formular', () => {
    expect(getDetailTypeLabel('Formular')).toBe('Formular');
    expect(getDetailTypeLabel('Formular', null)).toBe('Formular');
  });

  it('Vertrag is not renamed by medical terms', () => {
    const rohText = 'MRT Überweisung Radiologie Facharzt';
    expect(getDetailTypeLabel('Vertrag', rohText)).toBe('Vertrag');
  });

  it('Rechnung is not renamed by medical terms', () => {
    const rohText = 'MRT Überweisung Radiologie';
    expect(getDetailTypeLabel('Rechnung', rohText)).toBe('Rechnung');
  });
});

describe('getDetailTypeLabel — standard cases unchanged', () => {
  it('Steuerbescheid => Steuerbescheid', () => expect(getDetailTypeLabel('Steuerbescheid')).toBe('Steuerbescheid'));
  it('Mahnung => Mahnung', () => expect(getDetailTypeLabel('Mahnung')).toBe('Mahnung'));
  it('Rechnung => Rechnung', () => expect(getDetailTypeLabel('Rechnung')).toBe('Rechnung'));
  it('Versicherung => Versicherungsdokument', () => expect(getDetailTypeLabel('Versicherung')).toBe('Versicherungsdokument'));
  it('Vertrag => Vertrag', () => expect(getDetailTypeLabel('Vertrag')).toBe('Vertrag'));
});

describe('getDetailTypeLabel — display-time weak type upgrade', () => {
  it('Sonstiges + Rechnung in rohText => Rechnung', () => {
    expect(getDetailTypeLabel('Sonstiges', 'Rechnung Nr. 2024-001 Gesamtsumme 128,80 EUR')).toBe('Rechnung');
  });

  it('Dokument + Amtsgericht in rohText => Behördenbrief', () => {
    expect(getDetailTypeLabel('Dokument', 'Amtsgericht Saarbrücken Aktenzeichen 62 IK 64/09')).toBe('Behördenbrief');
  });

  it('Sonstiges + DRV Bund in rohText => Behördenbrief', () => {
    expect(getDetailTypeLabel('Sonstiges', 'Deutsche Rentenversicherung Bund Rentenbezugsbescheinigung')).toBe('Behördenbrief');
  });

  it('strong type Rechnungen not overwritten by court rohText', () => {
    expect(getDetailTypeLabel('Rechnungen', 'Amtsgericht Saarbrücken')).toBe('Rechnung');
  });

  it('strong type Versicherung not overwritten by invoice rohText', () => {
    expect(getDetailTypeLabel('Versicherung', 'Rechnungsnummer 12345')).toBe('Versicherungsdokument');
  });

  it('Sonstiges without matching rohText stays Sonstiges', () => {
    expect(getDetailTypeLabel('Sonstiges', 'Willkommen bei sim.de Julia Stiegler')).toBe('Sonstiges');
  });
});

describe('resolveDisplayDocumentType — compact card resolver', () => {
  it('upgrades weak invoice type for card visuals and labels', () => {
    const result = resolveDisplayDocumentType(
      'Sonstiges',
      'Autodoc GmbH Facture Bon de sortie Rechnungsnummer 17038456 Gesamtsumme 78,73 EUR',
      'Dokument',
    );
    expect(result.detailLabel).toBe('Rechnung');
    expect(result.semanticType).toBe('Rechnungen');
    expect(result.config.shortLabel).toBe('Rechnung');
  });

  it('upgrades weak authority type for card visuals and labels', () => {
    const result = resolveDisplayDocumentType(
      'Dokument',
      'Deutsche Rentenversicherung Bund Rentenbezugsbescheinigung',
      'Dokument',
    );
    expect(result.detailLabel).toBe('Behördenbrief');
    expect(result.semanticType).toBe('Behörden / Amt');
    expect(result.config.shortLabel).toBe('Behörde');
  });
});
