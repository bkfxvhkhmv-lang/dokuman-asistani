import { resolveOcrDocTypeLabel, translateDocumentTypeLabel } from '@/i18n/documentTypeLabels';

// Minimal stub: returns the key itself when no translation is found (matches real t() behaviour)
const tDe = (key: string): string => {
  const MAP: Record<string, string> = {
    'ocr.doctype.invoice':    'Rechnung',
    'ocr.doctype.settlement': 'Nebenkosten',
    'ocr.doctype.insurance':  'Versicherungsdokument',
    'ocr.doctype.quote':      'Angebot',
    'ocr.doctype.form':       'Formular',
    'ocr.doctype.letter':     'Brief',
    'ocr.doctype.unknown':    'Dokument',
  };
  return MAP[key] ?? key;
};

describe('resolveOcrDocTypeLabel', () => {
  it('known OCR kind returns German label', () => {
    expect(resolveOcrDocTypeLabel('invoice', tDe)).toBe('Rechnung');
    expect(resolveOcrDocTypeLabel('letter', tDe)).toBe('Brief');
    expect(resolveOcrDocTypeLabel('form', tDe)).toBe('Formular');
  });

  it('unknown German kind (no ocr.doctype key) shows the raw word, never the key', () => {
    const result = resolveOcrDocTypeLabel('Mahnung', tDe);
    expect(result).toBe('Mahnung');
    expect(result).not.toContain('ocr.doctype');
  });

  it('other German raw kinds are passed through', () => {
    expect(resolveOcrDocTypeLabel('Bußgeld', tDe)).toBe('Bußgeld');
    expect(resolveOcrDocTypeLabel('Vertrag', tDe)).toBe('Vertrag');
  });

  it('null / undefined / empty → "Dokument" fallback', () => {
    expect(resolveOcrDocTypeLabel(null, tDe)).toBe('Dokument');
    expect(resolveOcrDocTypeLabel(undefined, tDe)).toBe('Dokument');
    expect(resolveOcrDocTypeLabel('', tDe)).toBe('Dokument');
  });

  it('"unknown" kind → "Dokument" fallback', () => {
    expect(resolveOcrDocTypeLabel('unknown', tDe)).toBe('Dokument');
  });
});

describe('translateDocumentTypeLabel — ocr.doctype.* prefix strip', () => {
  it('strips ocr.doctype. prefix before resolving', () => {
    // "ocr.doctype.Mahnung" → strip → "Mahnung" → TYPE_KEY_MAP match → German label
    const result = translateDocumentTypeLabel('ocr.doctype.Mahnung', 'de');
    expect(result).toBe('Mahnung');
    expect(result).not.toContain('ocr.doctype');
  });

  it('strips prefix for other known German types', () => {
    expect(translateDocumentTypeLabel('ocr.doctype.Rechnung', 'de')).toBe('Rechnung');
    expect(translateDocumentTypeLabel('ocr.doctype.Bußgeld', 'de')).toBe('Bußgeld');
    expect(translateDocumentTypeLabel('ocr.doctype.Vertrag', 'de')).toBe('Vertrag');
    expect(translateDocumentTypeLabel('ocr.doctype.Zahlungserinnerung', 'de')).toBe('Mahnung');
    expect(translateDocumentTypeLabel('ocr.doctype.Zahlungserinnerung', 'de')).not.toContain('ocr.doctype');
  });

  it('strips prefix for English OCR kind names', () => {
    // "ocr.doctype.invoice" → strip → "invoice" → not in TYPE_KEY_MAP → "invoice"
    // Still better than showing the full dot-notated key
    const result = translateDocumentTypeLabel('ocr.doctype.invoice', 'de');
    expect(result).not.toContain('ocr.doctype');
  });

  it('normal German values (no prefix) are unaffected', () => {
    expect(translateDocumentTypeLabel('Mahnung', 'de')).toBe('Mahnung');
    expect(translateDocumentTypeLabel('Rechnung', 'de')).toBe('Rechnung');
    expect(translateDocumentTypeLabel('Rechnungen', 'de')).toBe('Rechnungen');
  });

  it('null / empty → Sonstiges fallback', () => {
    const result = translateDocumentTypeLabel(null, 'de');
    // Returns the unknown label — never a raw key
    expect(result).not.toContain('ocr.doctype');
    expect(result).not.toContain('doc.type');
  });
});
