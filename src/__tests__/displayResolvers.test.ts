import {
  resolveDocumentTitle,
  resolveDocumentSender,
  isWeakTitle,
  isStrongTitle,
} from '@/utils/displaySanitizer';

// ── resolveDocumentTitle — priority chain (#142A) ───────────────────────────

describe('resolveDocumentTitle — customTitle > strong titel > aiDisplayTitle > fallback', () => {
  const strongBase = { titel: 'Rechnung — Vodafone Deutschland', typ: 'Rechnung', confidence: 80 };
  const weakBase = { titel: 'Sonstiges — Unbekannt', typ: 'Sonstiges', confidence: 80 };

  it('customTitle wins over strong titel and aiDisplayTitle', () => {
    expect(resolveDocumentTitle({
      ...strongBase,
      customTitle: 'Meine Rechnung',
      aiDisplayTitle: 'MRT-Überweisung',
    })).toBe('Meine Rechnung');
  });

  it('strong titel beats aiDisplayTitle when customTitle is absent', () => {
    expect(resolveDocumentTitle({
      ...strongBase,
      customTitle: null,
      aiDisplayTitle: 'MRT-Überweisung',
    })).toBe('Rechnung — Vodafone Deutschland');
  });

  it('weak titel yields to aiDisplayTitle', () => {
    expect(resolveDocumentTitle({
      ...weakBase,
      customTitle: null,
      aiDisplayTitle: 'Schornsteinfeger Rechnung',
    })).toBe('Schornsteinfeger Rechnung');
  });

  it('aiDisplayTitle wins when customTitle is empty string and titel is weak', () => {
    expect(resolveDocumentTitle({
      ...weakBase,
      customTitle: '',
      aiDisplayTitle: 'Nebenkostenabrechnung',
    })).toBe('Nebenkostenabrechnung');
  });

  it('falls back to strong titel when neither customTitle nor aiDisplayTitle set', () => {
    expect(resolveDocumentTitle({
      titel: 'Formular',
      typ: 'Formular',
      confidence: 80,
      customTitle: null,
    })).toBe('Formular');
  });

  it('empty aiDisplayTitle with weak titel uses fallback', () => {
    expect(resolveDocumentTitle({
      ...weakBase,
      customTitle: null,
      aiDisplayTitle: '',
      datum: '2026-06-12T00:00:00.000Z',
    })).toBe('Dokument · 12.06.2026');
  });

  it('customTitle is never overwritten — aiDisplayTitle does not affect it', () => {
    const result = resolveDocumentTitle({
      ...strongBase,
      customTitle: 'Meine eigene Rechnung',
      aiDisplayTitle: 'AI-Vorschlag sollte verlieren',
    });
    expect(result).not.toContain('AI-Vorschlag');
    expect(result).toContain('Rechnung');
  });

  it('weak titel without aiDisplayTitle uses buildSafeDocumentTitleFallback', () => {
    expect(resolveDocumentTitle({
      titel: 'Scan vom 17.06.2026 14:33',
      typ: 'Sonstiges',
      createdAt: '2026-06-17T12:00:00.000Z',
    })).toBe('Dokument · 17.06.2026');
  });
});

describe('isWeakTitle / isStrongTitle', () => {
  it.each([
    '',
    'ab',
    'Sonstiges — Unbekannt',
    'Scan vom 17.06.2026 14:33',
    'Wird analysiert…',
    'image_123',
    'IMG_0042',
    'Scan 1780169901922',
    'page-1',
    '2026-06-17 · Scan 01',
  ])('isWeakTitle true for %s', (title) => {
    expect(isWeakTitle(title)).toBe(true);
    expect(isStrongTitle(title)).toBe(false);
  });

  it.each([
    'Rechnung — Vodafone Deutschland',
    'Mahnung Jobcenter',
    'Rechnung 2026',
    'AOK Bayern',
  ])('isStrongTitle true for %s', (title) => {
    expect(isStrongTitle(title)).toBe(true);
    expect(isWeakTitle(title)).toBe(false);
  });
});

// ── resolveDocumentSender — aiSender > normalized absender ────────────────

describe('resolveDocumentSender — aiSender > normalized absender', () => {
  it('aiSender is used when present', () => {
    expect(resolveDocumentSender({
      absender: 'Unbekannt',
      aiSender: 'BWW Energie',
    })).toBe('BWW Energie');
  });

  it('aiSender wins over rohText recovery', () => {
    expect(resolveDocumentSender({
      absender: 'Unbekannt',
      rohText: 'Kreisjugendamt Karlsruhe\nJugendamt',
      aiSender: 'Finanzamt Saarlouis',
    })).toBe('Finanzamt Saarlouis');
  });

  it('falls back to normalized absender when aiSender is absent', () => {
    const result = resolveDocumentSender({
      absender: 'Vodafone Deutschland GmbH',
      rohText: null,
    });
    expect(result).toBe('Vodafone');
  });

  it('falls back to rohText recovery when aiSender is absent and absender is weak', () => {
    const result = resolveDocumentSender({
      absender: 'Unbekannt',
      rohText: 'Kreisjugendamt Karlsruhe\nAmt für Jugend und Familie',
    });
    expect(result).toMatch(/kreisjugendamt karlsruhe/i);
  });

  it('empty aiSender falls back normally', () => {
    expect(resolveDocumentSender({
      absender: 'Vodafone GmbH',
      aiSender: '',
    })).toBe('Vodafone');
  });

  it('rejects footer/legal role strings as sender', () => {
    expect(resolveDocumentSender({
      absender: 'Vorsitzender des Aufsichtsrats: Dr. Marc Zimmermann',
    })).toBe('');
    expect(resolveDocumentSender({
      absender: 'Handelsregister Amtsgericht Köln HRB 12345',
    })).toBe('');
    expect(resolveDocumentSender({
      absender: 'Telefonnummer für Rückfragen: 0800 123456',
    })).toBe('');
    expect(resolveDocumentSender({
      absender: 'Geschäftsführer: Max Mustermann',
    })).toBe('');
  });

  it('keeps normal senders unchanged', () => {
    expect(resolveDocumentSender({ absender: 'Vodafone Deutschland GmbH' })).toBe('Vodafone');
    expect(resolveDocumentSender({ absender: 'Stadt Köln' })).toBe('Stadt Köln');
    expect(resolveDocumentSender({ absender: 'Deutsche Telekom AG' })).toBe('Deutsche Telekom');
  });

  it('aiSender still wins over a bad absender', () => {
    expect(resolveDocumentSender({
      absender: 'Vorsitzender des Aufsichtsrats',
      aiSender: 'BWW Energie',
    })).toBe('BWW Energie');
  });

  it('recovers sender from rohText when stored absender is footer/legal', () => {
    expect(resolveDocumentSender({
      absender: 'Vorsitzender des Aufsichtsrats',
      rohText: 'Kreisjugendamt Karlsruhe\nJugendamt',
    })).toMatch(/kreisjugendamt karlsruhe/i);
  });
});
