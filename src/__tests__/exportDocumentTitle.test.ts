import { safeDisplayDocumentTitleForExport } from '@/utils/displaySanitizer';

describe('safeDisplayDocumentTitleForExport', () => {
  it('decodes URL-encoded spaces and slashes', () => {
    expect(safeDisplayDocumentTitleForExport('Steuer%20B%2030')).toBe('Steuer B 30');
  });

  it('decodes URL-encoded filename', () => {
    expect(safeDisplayDocumentTitleForExport('Vodafone%20Rechnung.pdf')).toBe('Vodafone Rechnung.pdf');
  });

  it('leaves plain strings unchanged', () => {
    expect(safeDisplayDocumentTitleForExport('Ummeldung30')).toBe('Ummeldung30');
  });

  it('returns fallback for empty string', () => {
    expect(safeDisplayDocumentTitleForExport('')).toBe('Unbekanntes Dokument');
  });

  it('returns fallback for null', () => {
    expect(safeDisplayDocumentTitleForExport(null)).toBe('Unbekanntes Dokument');
  });

  it('returns fallback for undefined', () => {
    expect(safeDisplayDocumentTitleForExport(undefined)).toBe('Unbekanntes Dokument');
  });

  it('normalizes extra whitespace', () => {
    expect(safeDisplayDocumentTitleForExport('Steuer%20%20Bescheid')).toBe('Steuer Bescheid');
  });

  it('returns original if decodeURIComponent would throw (malformed)', () => {
    expect(safeDisplayDocumentTitleForExport('Steuer%GGBescheid')).toBe('Steuer%GGBescheid');
  });

  it('rejects page-only placeholder titles', () => {
    expect(safeDisplayDocumentTitleForExport('page-1')).toBe('Unbekanntes Dokument');
  });

  it('rejects footer/legal title pollution', () => {
    expect(safeDisplayDocumentTitleForExport('Vorsitzender des Aufsichtsrats Dr. Marc Zimmermann')).toBe('Unbekanntes Dokument');
  });

  it('rejects contact-line OCR fragments after decoding', () => {
    expect(safeDisplayDocumentTitleForExport('ummer%20fu%CC%88r%20Ru%CC%88ckfragen')).toBe('Unbekanntes Dokument');
  });
});
