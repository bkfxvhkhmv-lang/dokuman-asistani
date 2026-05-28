import { safeDisplayTitel, humanizeTitle } from '@/utils/displaySanitizer';

describe('humanizeTitle', () => {
  it('decodes URL-encoded title', () => {
    expect(humanizeTitle('Steuer%20B%2030')).toBe('Steuer B 30');
  });

  it('strips file extension', () => {
    expect(humanizeTitle('Vodafone Rechnung.pdf')).toBe('Vodafone Rechnung');
  });

  it('returns null for short strings', () => {
    expect(humanizeTitle('ab')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(humanizeTitle(null)).toBeNull();
    expect(humanizeTitle(undefined)).toBeNull();
  });
});

describe('safeDisplayTitel', () => {
  it('decodes URL-encoded title', () => {
    expect(safeDisplayTitel('Steuer%20B%2030')).toBe('Steuer B 30');
  });

  it('returns typ when title is empty', () => {
    expect(safeDisplayTitel('', 'Rechnung')).toBe('Rechnung');
  });

  it('returns Unbekanntes Dokument when title and typ both empty', () => {
    expect(safeDisplayTitel('', null)).toBe('Unbekanntes Dokument');
  });

  it('returns typ for low-confidence docs — never "Angaben prüfen"', () => {
    const result = safeDisplayTitel('Steuer Bescheid', 'Behörden / Amt', 30);
    expect(result).toBe('Behörden / Amt');
    expect(result).not.toContain('Angaben prüfen');
  });

  it('returns Unbekanntes Dokument for low-confidence with no typ', () => {
    const result = safeDisplayTitel('something', null, 20);
    expect(result).toBe('Unbekanntes Dokument');
    expect(result).not.toContain('Angaben prüfen');
  });

  it('returns humanized title for normal confidence', () => {
    expect(safeDisplayTitel('Steuer%20B%2030', 'Rechnung', 80)).toBe('Steuer B 30');
  });
});
