import { normalizeDokumentForDisplay } from '@/utils/normalizeDocument';
import type { Dokument } from '@/store';

function makeDok(overrides: Partial<Dokument>): Dokument {
  return {
    id: 'test-id',
    titel: 'Test',
    typ: 'rechnung',
    absender: 'Testfirma GmbH',
    zusammenfassung: null,
    warnung: null,
    betrag: null,
    waehrung: '€',
    frist: null,
    risiko: 'niedrig',
    aktionen: [],
    datum: '2024-07-01',
    gelesen: false,
    erledigt: false,
    uri: null,
    rohText: null,
    ...overrides,
  };
}

describe('normalizeDokumentForDisplay', () => {
  describe('Case 1 — Vodafone Gutschrift (negative amount)', () => {
    const dok = makeDok({
      absender: 'Vodafone Kundenservice',
      betrag: -93.01,
      typ: 'rechnung',
      dokumentDatum: '2024-07-09',
      datum: '2024-07-10',
    });
    const result = normalizeDokumentForDisplay(dok);

    it('amount.value is -93.01', () => {
      expect(result.amount.value).toBe(-93.01);
    });

    it('amount.semantics is credit', () => {
      expect(result.amount.semantics).toBe('credit');
    });

    it('nextStep is check_credit, not pay', () => {
      expect(result.nextStep?.action).toBe('check_credit');
      expect(result.nextStep?.action).not.toBe('pay');
    });

    it('documentDate uses dokumentDatum, not scan datum', () => {
      expect(result.documentDate.value).toBe('2024-07-09');
      expect(result.scanDate).toBe('2024-07-10');
    });

    it('sender is Vodafone Kundenservice', () => {
      expect(result.sender.value).toBe('Vodafone Kundenservice');
    });
  });

  describe('Case 2 — Schmelz Bußgeld (positive amount)', () => {
    const dok = makeDok({
      absender: 'Gemeinde Schmelz',
      betrag: 30,
      typ: 'bussgeldbescheid',
    });
    const result = normalizeDokumentForDisplay(dok);

    it('amount.value is 30', () => {
      expect(result.amount.value).toBe(30);
    });

    it('amount.semantics is payable', () => {
      expect(result.amount.semantics).toBe('payable');
    });

    it('nextStep is pay', () => {
      expect(result.nextStep?.action).toBe('pay');
    });

    it('sender is Gemeinde Schmelz', () => {
      expect(result.sender.value).toBe('Gemeinde Schmelz');
    });

    it('documentType maps to notice', () => {
      expect(result.documentType.value).toBe('notice');
    });
  });

  describe('Case 3 — Unknown amount', () => {
    const dok = makeDok({ betrag: null });
    const result = normalizeDokumentForDisplay(dok);

    it('amount.value is null', () => {
      expect(result.amount.value).toBeNull();
    });

    it('amount.semantics is unknown', () => {
      expect(result.amount.semantics).toBe('unknown');
    });

    it('nextStep is undefined when amount unknown', () => {
      expect(result.nextStep).toBeUndefined();
    });
  });

  describe('Case 4 — No sender', () => {
    const dok = makeDok({ absender: '' });
    const result = normalizeDokumentForDisplay(dok);

    it('sender.value is null', () => {
      expect(result.sender.value).toBeNull();
    });

    it('sender.confidence is unknown', () => {
      expect(result.sender.confidence).toBe('unknown');
    });
  });

  describe('Invariants', () => {
    it('scan datum does not leak into documentDate', () => {
      const dok = makeDok({ datum: '2024-01-15', dokumentDatum: undefined });
      const result = normalizeDokumentForDisplay(dok);
      expect(result.documentDate.value).toBeNull();
      expect(result.scanDate).toBe('2024-01-15');
    });

    it('warnung maps to warnings array', () => {
      const dok = makeDok({ warnung: 'Frist abgelaufen' });
      const result = normalizeDokumentForDisplay(dok);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe('Frist abgelaufen');
    });

    it('no warnung → empty warnings array', () => {
      const dok = makeDok({ warnung: null });
      const result = normalizeDokumentForDisplay(dok);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
