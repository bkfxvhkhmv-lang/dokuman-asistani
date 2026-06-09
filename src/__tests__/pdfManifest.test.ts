import { pdfManifestService } from '@/pdf';
import type { Dokument } from '@/store';

describe('PdfManifestService', () => {
  const baseDok: Dokument = {
    id:      'doc-1',
    titel:   'Test',
    typ:     'Rechnung',
    absender: 'Firma X',
    zusammenfassung: null,
    warnung:          null,
    betrag:  42,
    waehrung: 'EUR',
    frist:   null,
    risiko: 'niedrig',
    aktionen: [],
    datum: new Date().toISOString(),
    gelesen: false,
    erledigt: false,
    uri: null,
    rohText: null,
    pages: [
      { id: 'p1', order: 2, uri: 'file:///a.jpg' },
      { id: 'p2', order: 1, uri: 'file:///b.jpg' },
    ],
  };

  it('buildFromDocument sorts by order ascending', () => {
    const m = pdfManifestService.buildFromDocument(baseDok);
    expect(m.pages.map(p => p.id)).toEqual(['p2', 'p1']);
    expect(m.dokumentId).toBe('doc-1');
    expect(m.version).toBe(1);
    expect(typeof m.compiledAt).toBe('string');
  });

  it('serialize/parse roundtrip', () => {
    const m = pdfManifestService.buildFromDocument(baseDok);
    const json = pdfManifestService.serialize(m);
    const back = pdfManifestService.parse(json);
    expect(back).toEqual(m);
  });

  it('mergeProfile updates profile field', () => {
    const m = pdfManifestService.buildFromDocument(baseDok);
    const merged = pdfManifestService.mergeProfile(m, 'draft');
    expect(merged.profile).toBe('draft');
  });

  it('reject invalid JSON', () => {
    expect(pdfManifestService.parse('')).toBe(null);
    expect(pdfManifestService.parse('{}')).toBe(null);
    expect(pdfManifestService.parse('{"version":99}')).toBe(null);
  });
});
