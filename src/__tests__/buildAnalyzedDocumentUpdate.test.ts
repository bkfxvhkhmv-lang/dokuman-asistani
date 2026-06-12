import { buildAnalyzedDocumentUpdate } from '@/features/detail/hooks/buildAnalyzedDocumentUpdate';
import type { Dokument } from '@/store';

const existing: Dokument = {
  id: 'existing-id',
  titel: 'Draft',
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
  gelesen: true,
  erledigt: true,
  favorit: true,
  uri: 'file:///docs/existing.jpg',
  fileRelativePath: 'doc/existing.jpg',
  pages: [{ id: 'p-1', uri: 'file:///docs/existing.jpg', width: 100, height: 200, order: 0 }],
  rohText: null,
  customTitle: 'My custom title',
  userOrdner: '2026 / Private',
  etiketten: ['important'],
  aufgaben: [{ id: 'a-1', titel: 'Follow up', erledigt: false }],
  unsignedUri: 'file:///docs/unsigned.pdf',
  signedPreviewUri: 'file:///docs/signed-preview.jpg',
};

const draft: Dokument = {
  id: 'draft-id',
  titel: 'Analysed title',
  typ: 'Rechnungen',
  absender: 'Acme GmbH',
  zusammenfassung: 'Analysed summary',
  warnung: null,
  betrag: 123.45,
  waehrung: '€',
  frist: null,
  risiko: 'niedrig',
  aktionen: ['zahlen'],
  datum: '2026-06-11T00:00:00.000Z',
  gelesen: false,
  erledigt: false,
  favorit: false,
  uri: 'file:///docs/draft.jpg',
  fileRelativePath: 'doc/draft.jpg',
  pages: [{ id: 'p-1', uri: 'file:///docs/draft.jpg', width: 50, height: 100, order: 0 }],
  rohText: 'raw text from ocr',
  v4JobStatus: 'completed',
};

describe('buildAnalyzedDocumentUpdate', () => {
  it('keeps the existing document id and file identity', () => {
    const updated = buildAnalyzedDocumentUpdate(existing, draft);
    expect(updated.id).toBe('existing-id');
    expect(updated.uri).toBe('file:///docs/existing.jpg');
    expect(updated.fileRelativePath).toBe('doc/existing.jpg');
    expect(updated.pages).toBe(existing.pages);
  });

  it('applies OCR-derived fields from the draft', () => {
    const updated = buildAnalyzedDocumentUpdate(existing, draft);
    expect(updated.titel).toBe('Analysed title');
    expect(updated.typ).toBe('Rechnungen');
    expect(updated.absender).toBe('Acme GmbH');
    expect(updated.betrag).toBe(123.45);
    expect(updated.rohText).toBe('raw text from ocr');
    expect(updated.v4JobStatus).toBe('completed');
  });

  it('preserves user edits and document state', () => {
    const updated = buildAnalyzedDocumentUpdate(existing, draft);
    expect(updated.datum).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.gelesen).toBe(true);
    expect(updated.erledigt).toBe(true);
    expect(updated.favorit).toBe(true);
    expect(updated.etiketten).toEqual(['important']);
    expect(updated.customTitle).toBe('My custom title');
    expect(updated.userOrdner).toBe('2026 / Private');
    expect(updated.aufgaben).toBe(existing.aufgaben);
    expect(updated.unsignedUri).toBe('file:///docs/unsigned.pdf');
    expect(updated.signedPreviewUri).toBe('file:///docs/signed-preview.jpg');
  });
});
