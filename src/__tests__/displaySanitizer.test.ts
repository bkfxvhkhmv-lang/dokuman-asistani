import { safeDisplayTitel, humanizeTitle, sanitizeOcrTitle, resolveDocumentTitle } from '@/utils/displaySanitizer';

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

  it('decodes percent-encoded combining characters to NFC', () => {
    expect(humanizeTitle('Abfallgebu%CC%88hren')).toBe('Abfallgebühren');
  });

  it('does not throw on malformed percent strings', () => {
    expect(humanizeTitle('%E0%A4%A')).toBeTruthy();
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

  it('rejects page-only OCR titles and falls back to document type', () => {
    expect(safeDisplayTitel('page-1', 'Rechnung', 90)).toBe('Rechnung');
    expect(safeDisplayTitel('Page 1', 'Vertrag', 90)).toBe('Vertrag');
    expect(safeDisplayTitel('page_1', 'Bescheid', 90)).toBe('Bescheid');
  });

  it('rejects footer/legal role strings as titles', () => {
    expect(
      safeDisplayTitel('Vorsitzender des Aufsichtsrats: Dr. Marc Daniel Zimmermann', 'Versicherung', 90),
    ).toBe('Versicherung');
    expect(
      safeDisplayTitel('Handelsregister Amtsgericht Köln HRB 12345', 'Versicherung', 90),
    ).toBe('Versicherung');
  });

  it('rejects contact-line OCR fragments as titles', () => {
    expect(
      safeDisplayTitel('Telefonnummer für Rückfragen: 0800 123456', 'Rechnung', 90),
    ).toBe('Rechnung');
    expect(
      safeDisplayTitel('ummer%20fu%CC%88r%20Ru%CC%88ckfragen', 'Rechnung', 90),
    ).toBe('Rechnung');
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

describe('resolveDocumentTitle', () => {
  it('falls back to sender + type for rejected raw OCR titles', () => {
    expect(
      resolveDocumentTitle({
        titel: 'page-1',
        typ: 'Versicherung',
        absender: 'AXA easy Versicherung AG',
        datum: '2026-06-12T00:00:00.000Z',
      }),
    ).toBe('AXA · Versicherung');
  });

  it('falls back to type + date when sender is not useful', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Telefonnummer für Rückfragen',
        typ: 'Rechnung',
        absender: 'Unbekannt',
        datum: '2026-06-12T00:00:00.000Z',
      }),
    ).toBe('Rechnung vom 12.06.2026');
  });

  it('rejects bad ai/custom titles and still uses safe fallback', () => {
    expect(
      resolveDocumentTitle({
        titel: 'page-1',
        customTitle: 'Vorstand: Max Mustermann',
        aiDisplayTitle: 'Handelsregister Köln',
        typ: 'Bescheid',
        absender: 'Jobcenter',
      }),
    ).toBe('Jobcenter · Bescheid');
  });
});
