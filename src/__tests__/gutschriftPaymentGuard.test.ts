/**
 * P0 regression: credit documents (betrag < 0) must never show payment copy.
 *
 * Covers leak paths:
 *   - kernPunkte.ts   — summary bullet "Zahlung vorbereiten"
 *   - hints.ts        — handlungsempfehlungen payment lines
 *   - (ActionsPanel canZahlenSecondary, SimpleDocumentOverview,
 *      MultiLayerSummaryView — React component guards, not unit-testable here)
 */

import { buildKernPunkte } from '@/services/smart-summary/kernPunkte';
import { buildHandlungsempfehlungen } from '@/services/smart-summary/hints';
import type { Dokument } from '@/store';

const PAYMENT_PATTERN = /zahlung|bezahlen|vorbereiten/i;

function makeDoc(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'test-doc',
    titel: 'Vodafone Gutschrift',
    absender: 'Vodafone GmbH',
    typ: 'Rechnung',
    betrag: -93.01,
    waehrung: '€',
    aktionen: ['zahlen'],
    erledigt: false,
    risiko: 'niedrig',
    rohText: '',
    zusammenfassung: '',
    confidence: 90,
    isDemo: false,
    ...overrides,
  } as Dokument;
}

const TOMORROW = new Date(Date.now() + 86400000).toISOString();
const YESTERDAY = new Date(Date.now() - 86400000).toISOString();
const IN_2_DAYS = new Date(Date.now() + 2 * 86400000).toISOString();

describe('Gutschrift payment copy guard', () => {
  describe('kernPunkte — no payment bullet for betrag < 0', () => {
    it('betrag -93.01, aktionen zahlen → no Zahlung bullet', () => {
      const punkte = buildKernPunkte(makeDoc());
      const joined = punkte.join(' ');
      expect(joined).not.toMatch(PAYMENT_PATTERN);
    });

    it('betrag -93.01, aktionen zahlen, overdue frist → no Zahlung bullet', () => {
      const punkte = buildKernPunkte(makeDoc({ frist: YESTERDAY }));
      const joined = punkte.join(' ');
      expect(joined).not.toMatch(PAYMENT_PATTERN);
    });

    it('betrag +93.01, aktionen zahlen → Zahlung bullet IS present', () => {
      const punkte = buildKernPunkte(makeDoc({ betrag: 93.01 }));
      const joined = punkte.join(' ');
      expect(joined).toMatch(PAYMENT_PATTERN);
    });
  });

  describe('hints — no payment recommendation for betrag < 0', () => {
    it('betrag -93.01, overdue frist → no Zahlung copy', () => {
      const recs = buildHandlungsempfehlungen(makeDoc({ frist: YESTERDAY }));
      const joined = recs.join(' ');
      expect(joined).not.toMatch(PAYMENT_PATTERN);
    });

    it('betrag -93.01, frist in 2 days → no Zahlung copy', () => {
      const recs = buildHandlungsempfehlungen(makeDoc({ frist: IN_2_DAYS }));
      const joined = recs.join(' ');
      expect(joined).not.toMatch(PAYMENT_PATTERN);
    });

    it('betrag -93.01, frist tomorrow → no Zahlung copy', () => {
      const recs = buildHandlungsempfehlungen(makeDoc({ frist: TOMORROW }));
      const joined = recs.join(' ');
      expect(joined).not.toMatch(PAYMENT_PATTERN);
    });

    it('betrag +93.01, overdue frist → Zahlung copy IS present', () => {
      const recs = buildHandlungsempfehlungen(makeDoc({ betrag: 93.01, frist: YESTERDAY }));
      const joined = recs.join(' ');
      expect(joined).toMatch(PAYMENT_PATTERN);
    });

    it('betrag +93.01, frist in 2 days → Zahlung copy IS present', () => {
      const recs = buildHandlungsempfehlungen(makeDoc({ betrag: 93.01, frist: IN_2_DAYS }));
      const joined = recs.join(' ');
      expect(joined).toMatch(PAYMENT_PATTERN);
    });
  });

  describe('edge cases', () => {
    it('betrag null → no payment copy in kernPunkte', () => {
      const punkte = buildKernPunkte(makeDoc({ betrag: undefined }));
      expect(punkte.join(' ')).not.toMatch(PAYMENT_PATTERN);
    });

    it('betrag 0 → no payment copy in hints', () => {
      const recs = buildHandlungsempfehlungen(makeDoc({ betrag: 0, frist: IN_2_DAYS }));
      expect(recs.join(' ')).not.toMatch(PAYMENT_PATTERN);
    });
  });
});
