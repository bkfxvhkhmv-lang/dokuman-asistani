import { needsManualReview, getManualReviewReasons } from '@/utils/documentGuards';
import type { Dokument } from '@/store';

function makeDoc(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'test-doc',
    titel: 'Test Dokument',
    absender: 'Testabsender GmbH',
    typ: 'Sonstiges',
    betrag: null,
    waehrung: '€',
    aktionen: [],
    erledigt: false,
    risiko: 'niedrig',
    rohText: '',
    zusammenfassung: '',
    confidence: 90,
    isDemo: false,
    ...overrides,
  } as Dokument;
}

describe('needsManualReview — deadline sensitivity', () => {
  it('Steuerbescheid mit Absender + Betrag, kein Frist → kein amber (fix)', () => {
    const doc = makeDoc({ typ: 'Steuerbescheid', absender: 'Finanzamt München', betrag: 1200, frist: undefined });
    expect(needsManualReview(doc)).toBe(false);
  });

  it('Kündigung mit Absender, kein Frist → kein amber (fix)', () => {
    const doc = makeDoc({ typ: 'Kündigung', absender: 'Deutsche Telekom', frist: undefined });
    expect(needsManualReview(doc)).toBe(false);
  });

  it('Mahnung mit Betrag, kein Frist → amber (Mahnung bleibt deadline-sensitiv)', () => {
    const doc = makeDoc({ typ: 'Mahnung', absender: 'Inkasso GmbH', betrag: 300, frist: undefined });
    expect(needsManualReview(doc)).toBe(true);
    expect(getManualReviewReasons(doc)).toContain('missing_deadline_for_urgent_doc');
  });

  it('Bußgeld kein Frist → amber (Bußgeld bleibt deadline-sensitiv)', () => {
    const doc = makeDoc({ typ: 'Bußgeld', absender: 'Stadt München', betrag: 50, frist: undefined });
    expect(needsManualReview(doc)).toBe(true);
    expect(getManualReviewReasons(doc)).toContain('missing_deadline_for_urgent_doc');
  });

  it('Mahnung mit Frist → kein deadline-Grund', () => {
    const doc = makeDoc({ typ: 'Mahnung', absender: 'Inkasso GmbH', betrag: 300, frist: '2026-07-01' });
    const reasons = getManualReviewReasons(doc);
    expect(reasons).not.toContain('missing_deadline_for_urgent_doc');
  });
});

describe('needsManualReview — amount sensitivity', () => {
  it('Rechnung ohne Betrag → amber', () => {
    const doc = makeDoc({ typ: 'Rechnung', absender: 'Vodafone', betrag: null });
    expect(needsManualReview(doc)).toBe(true);
    expect(getManualReviewReasons(doc)).toContain('missing_amount_for_payment_doc');
  });

  it('Rechnung mit Betrag → kein amount-Grund', () => {
    const doc = makeDoc({ typ: 'Rechnung', absender: 'Vodafone', betrag: 49.99 });
    const reasons = getManualReviewReasons(doc);
    expect(reasons).not.toContain('missing_amount_for_payment_doc');
  });
});

describe('needsManualReview — erledigt', () => {
  it('erledigt=true → nie amber', () => {
    const doc = makeDoc({ typ: 'Mahnung', betrag: null, frist: undefined, erledigt: true });
    expect(needsManualReview(doc)).toBe(false);
  });
});

describe('needsManualReview — identity', () => {
  it('Komplett leeres Dokument → amber (empty_identity)', () => {
    const doc = makeDoc({ typ: '', titel: '', absender: '', betrag: null, frist: undefined });
    expect(needsManualReview(doc)).toBe(true);
    expect(getManualReviewReasons(doc)).toContain('empty_identity_and_no_useful_fields');
  });

  it('Dokument mit Absender aber ohne Typ/Betrag/Frist → kein amber', () => {
    const doc = makeDoc({ typ: 'Sonstiges', absender: 'Testfirma', betrag: null, frist: undefined });
    expect(needsManualReview(doc)).toBe(false);
  });
});
