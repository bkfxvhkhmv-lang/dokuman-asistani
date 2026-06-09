import { deriveNextStep } from '@/utils/deriveNextStep';
import type { Dokument } from '@/store';

const base = (): Partial<Dokument> => ({
  titel: 'Testdokument',
  typ: 'Sonstiges',
  absender: 'Testabsender',
  risiko: 'niedrig',
  aktionen: [],
  frist: null,
  betrag: null,
  erledigt: false,
  confidence: null,
});

const fut = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

describe('deriveNextStep', () => {
  it('returns null for completed documents', () => {
    expect(deriveNextStep({ ...base(), erledigt: true } as Dokument)).toBeNull();
  });

  it('returns null when no signals present', () => {
    expect(deriveNextStep(base() as Dokument)).toBeNull();
  });

  it('check_credit: negative amount wins over low confidence', () => {
    const dok = { ...base(), betrag: -120, confidence: 30 } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('check_credit');
    expect(r?.urgency).toBe('info');
  });

  it('review: low confidence when amount is null', () => {
    const dok = { ...base(), confidence: 40 } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('review');
    expect(r?.urgency).toBe('warning');
  });

  it('overdue: past frist overrides risiko hoch', () => {
    const dok = { ...base(), frist: fut(-3), risiko: 'hoch' } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('overdue');
    expect(r?.urgency).toBe('critical');
  });

  it('urgent: risiko hoch when no frist overdue', () => {
    const dok = { ...base(), risiko: 'hoch' } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('urgent');
    expect(r?.urgency).toBe('critical');
  });

  it('deadline_soon: frist within 7 days', () => {
    const dok = { ...base(), frist: fut(5) } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('deadline_soon');
    expect(r?.urgency).toBe('warning');
  });

  it('deadline_soon: frist today (0 days)', () => {
    const dok = { ...base(), frist: fut(0) } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('deadline_soon');
  });

  it('pay: positive amount + zahlen action', () => {
    const dok = { ...base(), betrag: 249, aktionen: ['zahlen'] } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('pay');
    expect(r?.urgency).toBe('warning');
  });

  it('no pay: negative amount + zahlen action → check_credit wins', () => {
    const dok = { ...base(), betrag: -50, aktionen: ['zahlen'] } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('check_credit');
  });

  it('no pay: zero amount + zahlen action → null', () => {
    const dok = { ...base(), betrag: 0, aktionen: ['zahlen'] } as Dokument;
    expect(deriveNextStep(dok)).toBeNull();
  });

  it('einspruch action', () => {
    const dok = { ...base(), aktionen: ['einspruch'] } as Dokument;
    const r = deriveNextStep(dok);
    expect(r?.key).toBe('einspruch');
    expect(r?.urgency).toBe('info');
  });

  it('check_credit label is correct', () => {
    const dok = { ...base(), betrag: -80 } as Dokument;
    expect(deriveNextStep(dok)?.label).toBe('Gutschrift prüfen');
  });
});
