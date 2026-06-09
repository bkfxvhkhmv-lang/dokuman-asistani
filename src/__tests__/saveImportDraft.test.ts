import { buildDraftDocument, buildDraftTitle } from '@/features/ocr-mvp/domain/saveImportDraft';
import type { ScannedPage } from '@/store';

describe('saveImportDraft', () => {
  const pages: ScannedPage[] = [{
    id: 'p1',
    uri: 'file:///doc/scans/abc/page-1.pdf',
    relativePath: 'scans/abc/page-1.pdf',
    order: 1,
    rotation: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
  }];

  it('buildDraftTitle strips extension', () => {
    expect(buildDraftTitle('Rechnung.pdf', null)).toBe('Rechnung');
  });

  it('buildDraftDocument preserves pages and leaves analysis fields empty', () => {
    const doc = buildDraftDocument('doc-1', pages, 'Rechnung.pdf', pages[0].uri);
    expect(doc.id).toBe('doc-1');
    expect(doc.titel).toBe('Rechnung');
    expect(doc.pages).toEqual(pages);
    expect(doc.uri).toBe(pages[0].uri);
    expect(doc.rohText).toBeNull();
    expect(doc.typ).toBe('Sonstiges');
  });
});
