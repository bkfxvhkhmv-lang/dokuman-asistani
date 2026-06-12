import { isUnanalysedQuickSaved } from '@/features/detail/utils/isUnanalysedQuickSaved';
import type { Dokument } from '@/store';

function makeDok(partial: Partial<Dokument> = {}): Dokument {
  return {
    id: 'd-1',
    titel: 'Quick save',
    typ: 'Sonstiges',
    absender: 'Unbekannt',
    zusammenfassung: null,
    warnung: null,
    betrag: null,
    waehrung: '€',
    frist: null,
    risiko: 'niedrig',
    aktionen: [],
    datum: '2026-01-01T00:00:00.000Z',
    gelesen: false,
    erledigt: false,
    uri: 'file:///docs/scans/abc/page-1.pdf',
    rohText: null,
    ...partial,
  } as Dokument;
}

describe('isUnanalysedQuickSaved', () => {
  it('returns true for uri without rohText', () => {
    expect(isUnanalysedQuickSaved(makeDok())).toBe(true);
  });

  it('returns false when rohText is present', () => {
    expect(isUnanalysedQuickSaved(makeDok({ rohText: 'OCR text' }))).toBe(false);
  });

  it('returns false while analyzeStatus is processing', () => {
    expect(isUnanalysedQuickSaved(makeDok(), 'processing')).toBe(false);
  });

  it('returns false while analyzeStatus is uploading', () => {
    expect(isUnanalysedQuickSaved(makeDok(), 'uploading')).toBe(false);
  });

  it('returns false while v4JobStatus is processing', () => {
    expect(isUnanalysedQuickSaved(makeDok({ v4JobStatus: 'processing' }))).toBe(false);
  });

  it('returns false while v4JobStatus is pending', () => {
    expect(isUnanalysedQuickSaved(makeDok({ v4JobStatus: 'pending' }))).toBe(false);
  });

  it('returns false when uri is missing', () => {
    expect(isUnanalysedQuickSaved(makeDok({ uri: null }))).toBe(false);
  });

  it('returns false for null document', () => {
    expect(isUnanalysedQuickSaved(null)).toBe(false);
  });
});
