import { buildAnalyseFileFromDocument } from '@/features/detail/utils/buildAnalyseFileFromDocument';
import type { Dokument } from '@/store';

function makeDok(partial: Partial<Dokument>): Dokument {
  return {
    id: 'd-1',
    titel: partial.titel ?? 'Doc',
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
    uri: partial.uri ?? null,
    rohText: null,
    ...partial,
  } as Dokument;
}

describe('buildAnalyseFileFromDocument', () => {
  it('uses dateiName when it has a supported extension', () => {
    const dok = makeDok({
      uri: 'file:///docs/scans/abc/page-1.pdf',
      dateiName: 'Invoice.pdf',
      titel: 'page-1',
    });
    const file = buildAnalyseFileFromDocument(dok);
    expect(file).not.toBeNull();
    expect(file?.name).toBe('Invoice.pdf');
    expect(file?.mimeType).toBe('application/pdf');
    expect(file?.uri).toBe('file:///docs/scans/abc/page-1.pdf');
  });

  it('falls back to basename from dok.uri for a quick-saved PDF', () => {
    const dok = makeDok({
      uri: 'file:///docs/scans/abc/page-1.pdf',
      titel: 'page-1',
    });
    const file = buildAnalyseFileFromDocument(dok);
    expect(file).not.toBeNull();
    expect(file?.name).toBe('page-1.pdf');
    expect(file?.mimeType).toBe('application/pdf');
  });

  it('falls back to basename from first page uri for a quick-saved JPG', () => {
    const dok = makeDok({
      uri: 'file:///docs/scans/abc/page-1.jpg',
      titel: 'page-1',
      pages: [{ id: 'p-1', uri: 'file:///docs/scans/abc/page-1.jpg', width: 100, height: 200, order: 0 }],
    });
    const file = buildAnalyseFileFromDocument(dok);
    expect(file).not.toBeNull();
    expect(file?.name).toBe('page-1.jpg');
    expect(file?.mimeType).toBe('image/jpeg');
  });

  it('uses uri basename when title has no extension', () => {
    const dok = makeDok({
      uri: 'file:///docs/scans/abc/page-1.pdf',
      titel: 'Abfallgebühren',
    });
    const file = buildAnalyseFileFromDocument(dok);
    expect(file).not.toBeNull();
    expect(file?.name).toBe('page-1.pdf');
    expect(file?.mimeType).toBe('application/pdf');
  });

  it('returns null when no supported extension can be determined', () => {
    const dok = makeDok({
      uri: 'file:///docs/scans/abc/page-1',
      titel: 'Abfallgebühren',
    });
    const file = buildAnalyseFileFromDocument(dok);
    expect(file).toBeNull();
  });

  it('does not use extension-less title as filename', () => {
    const dok = makeDok({
      uri: 'file:///docs/scans/abc/page-1',
      titel: 'Mysterious Document',
    });
    const file = buildAnalyseFileFromDocument(dok);
    expect(file).toBeNull();
  });

});
