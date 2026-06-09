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
});
