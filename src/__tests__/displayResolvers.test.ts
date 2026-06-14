import { resolveDocumentTitle, resolveDocumentSender } from '@/utils/displaySanitizer';

// ── resolveDocumentTitle — priority chain ──────────────────────────────────

describe('resolveDocumentTitle — customTitle > aiDisplayTitle > titel', () => {
  const base = { titel: 'Formular', typ: 'Formular', confidence: 80 };

  it('customTitle wins over aiDisplayTitle and titel', () => {
    expect(resolveDocumentTitle({
      ...base,
      customTitle: 'Meine Rechnung',
      aiDisplayTitle: 'MRT-Überweisung',
    })).toBe('Meine Rechnung');
  });

  it('aiDisplayTitle wins when customTitle is absent', () => {
    expect(resolveDocumentTitle({
      ...base,
      customTitle: null,
      aiDisplayTitle: 'MRT-Überweisung',
    })).toBe('MRT-Überweisung');
  });

  it('aiDisplayTitle wins when customTitle is empty string', () => {
    expect(resolveDocumentTitle({
      ...base,
      customTitle: '',
      aiDisplayTitle: 'Nebenkostenabrechnung',
    })).toBe('Nebenkostenabrechnung');
  });

  it('falls back to titel when neither customTitle nor aiDisplayTitle set', () => {
    const result = resolveDocumentTitle({ ...base, customTitle: null });
    expect(result).toBe('Formular');
  });

  it('empty aiDisplayTitle falls back to titel', () => {
    expect(resolveDocumentTitle({
      ...base,
      customTitle: null,
      aiDisplayTitle: '',
    })).toBe('Formular');
  });

  it('customTitle is never overwritten — aiDisplayTitle does not affect it', () => {
    // safeDisplayTitel applies humanization so customTitle may be title-cased;
    // the important assertion is that aiDisplayTitle does not win.
    const result = resolveDocumentTitle({
      ...base,
      customTitle: 'Meine eigene Rechnung',
      aiDisplayTitle: 'AI-Vorschlag sollte verlieren',
    });
    expect(result).not.toContain('AI-Vorschlag');
    expect(result).toContain('Rechnung');
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
