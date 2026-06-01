import { getDetailTypeLabel } from '@/constants/docTypeConfig';

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
