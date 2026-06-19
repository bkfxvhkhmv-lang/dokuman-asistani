import { resolveOcrDocTypeLabel } from '@/i18n/documentTypeLabels';

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
