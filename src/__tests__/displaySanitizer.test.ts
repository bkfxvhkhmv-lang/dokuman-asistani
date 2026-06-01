import { safeDisplayTitel, humanizeTitle, sanitizeOcrTitle } from '@/utils/displaySanitizer';

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

describe('sanitizeOcrTitle', () => {
  it('strips address tail when title > 40 chars and contains 5-digit PLZ', () => {
    const input = 'Pflanzhits GmbH Otto-Hahn-Strasse 21 26683 Saterland';
    const result = sanitizeOcrTitle(input);
    expect(result).toBe('Pflanzhits GmbH Otto-Hahn-Strasse 21');
    expect(result).not.toContain('26683');
  });

  it('strips legal boilerplate "ist eine Marke der"', () => {
    const input = 'sim de ist eine Marke der Drillisch Online GmbH - Wilhelm-Röntgen-Str 1-5-6347';
    const result = sanitizeOcrTitle(input);
    expect(result).toBe('sim de');
    expect(result).not.toContain('Drillisch');
  });

  it('leaves short legitimate org name unchanged', () => {
    expect(sanitizeOcrTitle('Raiffeisen Bank Schirner')).toBe('Raiffeisen Bank Schirner');
  });

  it('leaves title without PLZ or boilerplate unchanged', () => {
    expect(sanitizeOcrTitle('Unique Jewelry GmbH')).toBe('Unique Jewelry GmbH');
  });

  it('returns null/undefined unchanged', () => {
    expect(sanitizeOcrTitle(null)).toBeNull();
    expect(sanitizeOcrTitle(undefined)).toBeUndefined();
  });

  it('leaves short title with PLZ unchanged (does not strip)', () => {
    // Short enough that stripping would destroy meaningful content
    expect(sanitizeOcrTitle('Bonn 53113')).toBe('Bonn 53113');
  });
});

describe('humanizeTitle — sanitization integrated', () => {
  it('strips PLZ address tail from OCR title', () => {
    const result = humanizeTitle('Pflanzhits GmbH Otto-Hahn-Strasse 21 26683 Saterland');
    expect(result).not.toContain('26683');
    expect(result).toContain('Pflanzhits');
  });

  it('strips legal boilerplate from OCR title', () => {
    const result = humanizeTitle('sim de ist eine Marke der Drillisch Online GmbH');
    expect(result).toBe('Sim De');
    expect(result).not.toContain('Drillisch');
  });
});
