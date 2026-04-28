import { runSmartRiskEngine, buildPortfolioRisk } from '../services/SmartRiskEngineService';
import type { Dokument } from '../store';

function makeDok(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'test-1',
    titel: 'Testdokument',
    typ: 'Rechnung',
    absender: 'Testfirma GmbH',
    zusammenfassung: 'Eine Testrechnung',
    warnung: null,
    betrag: null,
    waehrung: 'EUR',
    frist: null,
    risiko: 'niedrig',
    aktionen: [],
    datum: '2025-01-01',
    gelesen: true,
    erledigt: false,
    uri: null,
    rohText: null,
    ...overrides,
  };
}

describe('runSmartRiskEngine — level classification', () => {
  it('returns a low-risk level for a completed, no-deadline document', () => {
    const dok = makeDok({ erledigt: true, risiko: 'niedrig', betrag: null, frist: null });
    const result = runSmartRiskEngine(dok);
    expect(['kein', 'niedrig']).toContain(result.level);
    expect(result.gesamtScore).toBeLessThan(35);
  });

  it('returns "kritisch" or "hoch" level for an overdue document with a high amount', () => {
    const pastDate = new Date(Date.now() - 86400000 * 5).toISOString();
    const dok = makeDok({
      typ: 'Mahnung',
      betrag: 8000,
      frist: pastDate,
      risiko: 'hoch',
    });
    const result = runSmartRiskEngine(dok);
    expect(['kritisch', 'hoch']).toContain(result.level);
    expect(result.gesamtScore).toBeGreaterThan(60);
  });

  it('returns a score of 0–100', () => {
    const dok = makeDok();
    const result = runSmartRiskEngine(dok);
    expect(result.gesamtScore).toBeGreaterThanOrEqual(0);
    expect(result.gesamtScore).toBeLessThanOrEqual(100);
  });
});

describe('runSmartRiskEngine — trend', () => {
  it('returns "verschlechtert" when the deadline is overdue', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = runSmartRiskEngine(makeDok({ frist: past }));
    expect(result.trend).toBe('verschlechtert');
  });

  it('returns "verbessert" for an erledigt document', () => {
    const result = runSmartRiskEngine(makeDok({ erledigt: true }));
    expect(result.trend).toBe('verbessert');
  });

  it('returns "stabil" for a document with plenty of time remaining', () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString();
    const result = runSmartRiskEngine(makeDok({ frist: future, betrag: null }));
    expect(result.trend).toBe('stabil');
  });
});

describe('runSmartRiskEngine — faktoren', () => {
  it('always returns at least 4 factors', () => {
    const result = runSmartRiskEngine(makeDok());
    expect(result.faktoren.length).toBeGreaterThanOrEqual(4);
  });

  it('includes a frist factor', () => {
    const result = runSmartRiskEngine(makeDok());
    const fristFaktor = result.faktoren.find(f => f.kategorie === 'frist');
    expect(fristFaktor).toBeDefined();
  });

  it('includes a betrag factor', () => {
    const result = runSmartRiskEngine(makeDok({ betrag: 250 }));
    const betragFaktor = result.faktoren.find(f => f.kategorie === 'betrag');
    expect(betragFaktor).toBeDefined();
    expect(betragFaktor!.score).toBeGreaterThan(0);
  });

  it('scores overdue deadline at 100', () => {
    const past = new Date(Date.now() - 86400000 * 10).toISOString();
    const result = runSmartRiskEngine(makeDok({ frist: past }));
    const fristFaktor = result.faktoren.find(f => f.kategorie === 'frist');
    expect(fristFaktor!.score).toBe(100);
  });
});

describe('runSmartRiskEngine — reduction suggestions', () => {
  it('suggests paying when payment is due soon', () => {
    const in2Days = new Date(Date.now() + 86400000 * 2).toISOString();
    const result = runSmartRiskEngine(makeDok({ betrag: 500, frist: in2Days }));
    const zahlSugg = result.reduzierungsVorschlaege.find(s => s.aktion === 'zahlen');
    expect(zahlSugg).toBeDefined();
  });

  it('suggests Einspruch for Bußgeld', () => {
    const result = runSmartRiskEngine(makeDok({ typ: 'Bußgeld', erledigt: false }));
    const einspruch = result.reduzierungsVorschlaege.find(s => s.aktion === 'einspruch');
    expect(einspruch).toBeDefined();
  });

  it('returns at most 4 suggestions', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = runSmartRiskEngine(makeDok({
      typ: 'Bußgeld',
      betrag: 500,
      frist: past,
      risiko: 'hoch',
    }));
    expect(result.reduzierungsVorschlaege.length).toBeLessThanOrEqual(4);
  });
});

describe('runSmartRiskEngine — peer comparison', () => {
  it('returns null when fewer than 3 docs are provided', () => {
    const dok = makeDok({ typ: 'Rechnung' });
    const result = runSmartRiskEngine(dok, [makeDok({ id: 'other-1', typ: 'Rechnung' })]);
    expect(result.peerComparison).toBeNull();
  });

  it('returns peer comparison when 3+ similar docs exist', () => {
    const dok = makeDok({ id: 'main', typ: 'Rechnung', risiko: 'hoch' });
    const peers = [
      makeDok({ id: 'p1', typ: 'Rechnung', risiko: 'niedrig' }),
      makeDok({ id: 'p2', typ: 'Rechnung', risiko: 'niedrig' }),
      makeDok({ id: 'p3', typ: 'Rechnung', risiko: 'niedrig' }),
    ];
    const result = runSmartRiskEngine(dok, [dok, ...peers]);
    expect(result.peerComparison).not.toBeNull();
    expect(result.peerComparison!.aehnlicheDokumente).toBe(3);
  });
});

describe('runSmartRiskEngine — erklaerung', () => {
  it('includes the document type in the explanation', () => {
    const dok = makeDok({ typ: 'Steuerbescheid' });
    const result = runSmartRiskEngine(dok);
    expect(result.erklaerung).toContain('Steuerbescheid');
  });

  it('mentions overdue deadline in explanation', () => {
    const past = new Date(Date.now() - 86400000 * 3).toISOString();
    const result = runSmartRiskEngine(makeDok({ frist: past }));
    expect(result.erklaerung).toMatch(/abgelaufen/i);
  });
});

describe('buildPortfolioRisk', () => {
  it('returns score 0 for empty document list', () => {
    const result = buildPortfolioRisk([]);
    expect(result.gesamtScore).toBe(0);
    expect(result.level).toBe('kein');
    expect(result.kritischCount).toBe(0);
  });

  it('sums open amounts correctly', () => {
    const docs = [
      makeDok({ id: '1', betrag: 100, erledigt: false }),
      makeDok({ id: '2', betrag: 250, erledigt: false }),
      makeDok({ id: '3', betrag: 50,  erledigt: true }),  // erledigt → excluded
    ];
    const result = buildPortfolioRisk(docs);
    expect(result.offenBetrag).toBe(350);
  });

  it('excludes completed docs from scoring', () => {
    const done = makeDok({ id: '1', erledigt: true });
    const resultWithDone = buildPortfolioRisk([done]);
    const resultEmpty = buildPortfolioRisk([]);
    expect(resultWithDone.gesamtScore).toBe(resultEmpty.gesamtScore);
  });

  it('returns top 5 risk documents at most', () => {
    const docs = Array.from({ length: 10 }, (_, i) =>
      makeDok({ id: String(i), betrag: i * 100, erledigt: false })
    );
    const result = buildPortfolioRisk(docs);
    expect(result.topRisikoDokumente.length).toBeLessThanOrEqual(5);
  });
});
