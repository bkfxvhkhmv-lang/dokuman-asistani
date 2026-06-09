import { buildEmailSubject } from '@/utils/replySubject';
import type { Dokument } from '@/store';

const base = (): Partial<Dokument> => ({
  titel: 'Testdokument',
  typ: 'Sonstiges',
  absender: '',
  risiko: 'niedrig',
  aktionen: [],
  frist: null,
  aktenzeichen: null,
  rechnungsnr: null,
  vertragsnr: null,
});

describe('buildEmailSubject', () => {
  it('returns template label as fallback when no fields present', () => {
    expect(buildEmailSubject('Widerspruch einlegen', base() as Dokument)).toBe('Widerspruch einlegen');
  });

  it('no dok → returns label', () => {
    expect(buildEmailSubject('Rückfrage / Klärung')).toBe('Rückfrage / Klärung');
  });

  it('Aktenzeichen has highest priority', () => {
    const dok = { ...base(), aktenzeichen: '340547', rechnungsnr: '99', frist: '2026-02-02' } as Dokument;
    expect(buildEmailSubject('Widerspruch einlegen', dok)).toBe('Widerspruch einlegen zu Aktenzeichen 340547');
  });

  it('Rechnungsnr used when no Aktenzeichen', () => {
    const dok = { ...base(), rechnungsnr: '101064679243' } as Dokument;
    expect(buildEmailSubject('Rückfrage / Klärung', dok)).toBe('Rückfrage / Klärung zu Rechnung 101064679243');
  });

  it('Vertragsnr used when no Aktenzeichen or Rechnungsnr', () => {
    const dok = { ...base(), vertragsnr: 'VT-2024-001' } as Dokument;
    expect(buildEmailSubject('Kündigung', dok)).toBe('Kündigung zu Vertrag VT-2024-001');
  });

  it('Frist used when no reference number', () => {
    const dok = { ...base(), frist: '2026-02-02' } as Dokument;
    const result = buildEmailSubject('Stundungsantrag', dok);
    expect(result).toContain('Frist bis');
    expect(result).toContain('02.02.2026');
    expect(result).not.toContain('vom');
  });

  it('Absender used when no reference number or frist', () => {
    const dok = { ...base(), absender: 'Vodafone Kundenservice' } as Dokument;
    expect(buildEmailSubject('Rückfrage / Klärung', dok)).toBe('Rückfrage / Klärung – Vodafone Kundenservice');
  });

  it('ignores Unbekannt absender', () => {
    const dok = { ...base(), absender: 'Unbekannter Absender' } as Dokument;
    expect(buildEmailSubject('Rückfrage / Klärung', dok)).toBe('Rückfrage / Klärung');
  });

  it('truncates long absender', () => {
    const long = 'A'.repeat(60);
    const dok = { ...base(), absender: long } as Dokument;
    const result = buildEmailSubject('Rückfrage / Klärung', dok);
    expect(result.length).toBeLessThan(120);
    expect(result).toContain('…');
  });

  it('empty absender string falls back to label', () => {
    const dok = { ...base(), absender: '' } as Dokument;
    expect(buildEmailSubject('Eingangsbestätigung', dok)).toBe('Eingangsbestätigung');
  });
});
