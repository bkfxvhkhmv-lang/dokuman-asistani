import { safeDisplayTitel, humanizeTitle, sanitizeOcrTitle, resolveDocumentTitle, isLikelyBadDocumentTitle } from '@/utils/displaySanitizer';

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
  it('falls back to type + date for rejected raw OCR titles', () => {
    expect(
      resolveDocumentTitle({
        titel: 'page-1',
        typ: 'Versicherung',
        absender: 'AXA easy Versicherung AG',
        datum: '2026-06-12T00:00:00.000Z',
      }),
    ).toBe('Versicherung · 12.06.2026');
  });

  it('falls back to type + date when sender is not useful', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Telefonnummer für Rückfragen',
        typ: 'Rechnung',
        absender: 'Unbekannt',
        datum: '2026-06-12T00:00:00.000Z',
      }),
    ).toBe('Rechnung · 12.06.2026');
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
    ).toBe('Bescheid');
  });

  it('rejects Page 1 / page-1 / page_1 in customTitle and aiDisplayTitle', () => {
    expect(
      resolveDocumentTitle({
        titel: 'page-1',
        customTitle: 'Page 1',
        typ: 'Rechnung',
      }),
    ).toBe('Rechnung');
    expect(
      resolveDocumentTitle({
        titel: 'page-1',
        aiDisplayTitle: 'page-1',
        typ: 'Rechnung',
      }),
    ).toBe('Rechnung');
    expect(
      resolveDocumentTitle({
        titel: 'page-1',
        aiDisplayTitle: 'page_1',
        typ: 'Rechnung',
      }),
    ).toBe('Rechnung');
  });

  it('decodes URL-encoded title for display', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Steuer%20B%2030',
        typ: 'Bescheid',
      }),
    ).toBe('Steuer B 30');
  });
});

describe('humanizeTitle — hash-like suffix stripping', () => {
  it('strips underscore-separated hex suffixes', () => {
    expect(humanizeTitle('Gutschrift_980880e7')).toBe('Gutschrift');
  });

  it('strips space-separated hex suffixes', () => {
    expect(humanizeTitle('Gutschrift 980880e7')).toBe('Gutschrift');
    expect(humanizeTitle('Kostenbescheid 1044f560')).toBe('Kostenbescheid');
  });

  it('does not strip plain numeric amounts, dates, or postal codes', () => {
    expect(humanizeTitle('Rechnung 123456')).toBe('Rechnung 123456');
    expect(humanizeTitle('Rechnung 2024')).toBe('Rechnung 2024');
    expect(humanizeTitle('Bonn 53113')).toBe('Bonn 53113');
  });
});

describe('isLikelyBadDocumentTitle — reference-number guard (#129A)', () => {
  const reject = [
    'Kundeninfo 35246587',
    'Kundeninfo35246587',
    'Kundennummer 12345678',
    'Kundennummer12345678',
    'Vertragsnummer 99234',
    'Vertragsnummer99234',
    'Referenz 123456789',
    'Nr. 123456789',
    'Code 123456789',
    'ID 123456789',
  ];

  it.each(reject)('rejects %s', (title) => {
    expect(isLikelyBadDocumentTitle(title)).toBe(true);
  });

  const keep = [
    'Rechnung 2026',
    'AOK Bayern',
    'Bußgeld 80',
    'Nebenkostenabrechnung 2022 2023',
    'Mahnung',
    'Ladung',
    'Bescheid',
    'Anhörung',
    'Kostenbescheid',
    'Gebührenbescheid',
  ];

  it.each(keep)('keeps %s', (title) => {
    expect(isLikelyBadDocumentTitle(title)).toBe(false);
  });
});

describe('resolveDocumentTitle — reference-number fallback (#129A)', () => {
  it('rejects Kundeninfo + reference id, Sonstiges → Dokument', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Kundeninfo 35246587',
        typ: 'Sonstiges',
        absender: 'Unbekannt',
      }),
    ).toBe('Dokument');
  });

  it('rejects concatenated Kundeninfo id, falls back to type', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Kundeninfo35246587',
        typ: 'Rechnung',
        absender: 'Vodafone GmbH',
      }),
    ).toBe('Rechnung');
  });

  it('prefers createdAt over datum for date fallback when type absent', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Code 99999999',
        typ: 'Unbekanntes Dokument',
        absender: '',
        datum: '2020-01-01T00:00:00.000Z',
        createdAt: '2026-06-13T00:00:00.000Z',
      }),
    ).toBe('Dokument · 13.06.2026');
  });

  it('keeps normal short titles', () => {
    expect(resolveDocumentTitle({ titel: 'Rechnung 2026', typ: 'Rechnung' })).toBe('Rechnung 2026');
    expect(resolveDocumentTitle({ titel: 'AOK Bayern', typ: 'Versicherung' })).toBe('AOK Bayern');
    expect(resolveDocumentTitle({ titel: 'Bußgeld 80', typ: 'Bußgeld' })).toBe('Bußgeld 80');
  });
});

describe('resolveDocumentTitle — disambiguation suffix (#129A)', () => {
  it('garbage title + good typ + date + id → Typ · date · shortId', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Kundeninfo 35246587',
        typ: 'Anhörung',
        absender: 'Amtsgericht',
        datum: '2026-06-16T00:00:00.000Z',
        id: 'abc123A7K3',
      }),
    ).toBe('Anhörung · 16.06.2026 · A7K3');
  });

  it('garbage title + Sonstiges + date + id → Dokument · date · shortId', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Kundennummer 12345678',
        typ: 'Sonstiges',
        absender: 'Unbekannt',
        datum: '2026-06-16T00:00:00.000Z',
        id: 'xyz789B9Q2',
      }),
    ).toBe('Dokument · 16.06.2026 · B9Q2');
  });

  it('garbage title + no id → omits shortId', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Kundennummer 12345678',
        typ: 'Rechnung',
        datum: '2026-06-16T00:00:00.000Z',
      }),
    ).toBe('Rechnung · 16.06.2026');
  });

  it('garbage title + no date + id → Typ · shortId', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Kundennummer 12345678',
        typ: 'Rechnung',
        id: 'abc123A7K3',
      }),
    ).toBe('Rechnung · A7K3');
  });

  it('garbage title + no date + no id + Sonstiges → Dokument', () => {
    expect(
      resolveDocumentTitle({
        titel: 'Kundennummer 12345678',
        typ: 'Sonstiges',
      }),
    ).toBe('Dokument');
  });

  it('normal titles are not affected by id field', () => {
    expect(resolveDocumentTitle({ titel: 'Rechnung 2026', typ: 'Rechnung', id: 'abc123A7K3' })).toBe('Rechnung 2026');
    expect(resolveDocumentTitle({ titel: 'Mahnung', typ: 'Sonstiges', id: 'abc123A7K3' })).toBe('Mahnung');
    expect(resolveDocumentTitle({ titel: 'Ladung', typ: 'Sonstiges', id: 'abc123A7K3' })).toBe('Ladung');
  });
});
