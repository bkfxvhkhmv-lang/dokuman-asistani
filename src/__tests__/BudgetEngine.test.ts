import { buildBudgetSnapshot } from '@/services/BudgetEngine';
import type { Dokument } from '@/store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDok(overrides: Partial<Dokument> & { id: string }): Dokument {
  return {
    titel: 'Test',
    typ: 'Rechnung',
    absender: 'TestFirma',
    zusammenfassung: null,
    warnung: null,
    betrag: null,
    waehrung: 'EUR',
    frist: null,
    risiko: 'niedrig',
    aktionen: [],
    datum: new Date().toISOString(),
    gelesen: true,
    erledigt: false,
    uri: null,
    rohText: null,
    ...overrides,
  };
}

/** ISO string for a date that is N calendar months before the current month's 1st. */
function startOfMonthsAgo(n: number): string {
  const d = new Date();
  d.setDate(2); // avoid edge cases near month boundaries
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

/** ISO string for a date that is N days ago from today. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** ISO string for a date that is N days into the future. */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/** ISO string guaranteed to be in the current calendar month. */
function thisMonthDate(): string {
  const d = new Date();
  d.setDate(2);
  return d.toISOString();
}

// ─── buildBudgetSnapshot — empty input ────────────────────────────────────────

describe('buildBudgetSnapshot — empty input', () => {
  it('returns zero totals for empty array', () => {
    const s = buildBudgetSnapshot([]);
    expect(s.totalOpen).toBe(0);
    expect(s.thisMonthTotal).toBe(0);
    expect(s.unpaidCount).toBe(0);
    expect(s.paidThisMonth).toBe(0);
    expect(s.nextMonthEstimate).toBe(0);
    expect(s.recurringBills).toHaveLength(0);
    expect(s.insights).toHaveLength(0);
  });

  it('always returns exactly 6 monthly buckets', () => {
    const s = buildBudgetSnapshot([]);
    expect(s.monthlyBuckets).toHaveLength(6);
  });

  it('bucket totals are 0 when no docs', () => {
    const s = buildBudgetSnapshot([]);
    s.monthlyBuckets.forEach(b => expect(b.total).toBe(0));
  });
});

// ─── buildBudgetSnapshot — totalOpen ──────────────────────────────────────────

describe('buildBudgetSnapshot — totalOpen', () => {
  it('sums only unpaid docs with positive betrag', () => {
    const docs = [
      makeDok({ id: '1', betrag: 200, erledigt: false }),
      makeDok({ id: '2', betrag: 300, erledigt: false }),
      makeDok({ id: '3', betrag: 100, erledigt: true  }), // paid → excluded
      makeDok({ id: '4', betrag: null,erledigt: false }), // no amount → excluded
    ];
    expect(buildBudgetSnapshot(docs).totalOpen).toBe(500);
  });

  it('is 0 when all docs are erledigt', () => {
    const docs = [
      makeDok({ id: '1', betrag: 500, erledigt: true }),
      makeDok({ id: '2', betrag: 250, erledigt: true }),
    ];
    expect(buildBudgetSnapshot(docs).totalOpen).toBe(0);
  });

  it('excludes docs with zero betrag', () => {
    const docs = [makeDok({ id: '1', betrag: 0, erledigt: false })];
    expect(buildBudgetSnapshot(docs).totalOpen).toBe(0);
  });
});

// ─── buildBudgetSnapshot — unpaidCount ────────────────────────────────────────

describe('buildBudgetSnapshot — unpaidCount', () => {
  it('counts only open docs that have a betrag', () => {
    const docs = [
      makeDok({ id: '1', betrag: 100,  erledigt: false }),
      makeDok({ id: '2', betrag: 50,   erledigt: false }),
      makeDok({ id: '3', betrag: 999,  erledigt: true  }),
      makeDok({ id: '4', betrag: null, erledigt: false }),
    ];
    expect(buildBudgetSnapshot(docs).unpaidCount).toBe(2);
  });

  it('is 0 for empty array', () => {
    expect(buildBudgetSnapshot([]).unpaidCount).toBe(0);
  });
});

// ─── buildBudgetSnapshot — thisMonthTotal & paidThisMonth ─────────────────────

describe('buildBudgetSnapshot — thisMonthTotal', () => {
  it('includes all docs with betrag in the current month regardless of erledigt', () => {
    const docs = [
      makeDok({ id: '1', betrag: 100, datum: thisMonthDate(), erledigt: false }),
      makeDok({ id: '2', betrag: 200, datum: thisMonthDate(), erledigt: true  }),
      makeDok({ id: '3', betrag: 999, datum: startOfMonthsAgo(1), erledigt: false }), // last month
    ];
    expect(buildBudgetSnapshot(docs).thisMonthTotal).toBe(300);
  });
});

describe('buildBudgetSnapshot — paidThisMonth', () => {
  it('counts only erledigt docs in the current month', () => {
    const docs = [
      makeDok({ id: '1', betrag: 150, datum: thisMonthDate(), erledigt: true  }),
      makeDok({ id: '2', betrag: 100, datum: thisMonthDate(), erledigt: false }),
      makeDok({ id: '3', betrag: 300, datum: startOfMonthsAgo(1), erledigt: true }), // prior month
    ];
    expect(buildBudgetSnapshot(docs).paidThisMonth).toBe(150);
  });

  it('is 0 when nothing is paid this month', () => {
    const docs = [
      makeDok({ id: '1', betrag: 100, datum: thisMonthDate(), erledigt: false }),
    ];
    expect(buildBudgetSnapshot(docs).paidThisMonth).toBe(0);
  });
});

// ─── buildBudgetSnapshot — monthlyBuckets ─────────────────────────────────────

describe('buildBudgetSnapshot — monthlyBuckets', () => {
  it('last bucket corresponds to the current month', () => {
    const now = new Date();
    const expectedLabel = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][now.getMonth()];
    const s = buildBudgetSnapshot([]);
    expect(s.monthlyBuckets[5].label).toBe(expectedLabel);
  });

  it('buckets are in chronological order (oldest first)', () => {
    const s = buildBudgetSnapshot([]);
    for (let i = 1; i < 6; i++) {
      expect(s.monthlyBuckets[i].month > s.monthlyBuckets[i - 1].month).toBe(true);
    }
  });

  it('assigns doc amounts to correct bucket', () => {
    const docs = [
      makeDok({ id: '1', betrag: 123, datum: startOfMonthsAgo(0) }), // current month
      makeDok({ id: '2', betrag: 456, datum: startOfMonthsAgo(2) }), // 2 months ago
    ];
    const s = buildBudgetSnapshot(docs);
    expect(s.monthlyBuckets[5].total).toBe(123); // current month = index 5
    expect(s.monthlyBuckets[3].total).toBe(456); // 2 months ago = index 3
  });
});

// ─── detectRecurring (via buildBudgetSnapshot) ────────────────────────────────

describe('buildBudgetSnapshot — recurringBills', () => {
  it('detects monthly frequency when interval is ~30 days', () => {
    const docs = [
      makeDok({ id: '1', absender: 'Sparkasse', betrag: 100, datum: daysAgo(45) }),
      makeDok({ id: '2', absender: 'Sparkasse', betrag: 100, datum: daysAgo(15) }),
    ];
    const s = buildBudgetSnapshot(docs);
    const bill = s.recurringBills.find(r => r.absender === 'Sparkasse');
    expect(bill).toBeDefined();
    expect(bill!.frequency).toBe('monatlich');
  });

  it('detects quarterly frequency when interval is ~90 days', () => {
    const docs = [
      makeDok({ id: '1', absender: 'VersicherungAG', betrag: 300, datum: daysAgo(100) }),
      makeDok({ id: '2', absender: 'VersicherungAG', betrag: 300, datum: daysAgo(10)  }),
    ];
    const s = buildBudgetSnapshot(docs);
    const bill = s.recurringBills.find(r => r.absender === 'VersicherungAG');
    expect(bill).toBeDefined();
    expect(bill!.frequency).toBe('quartalsweise');
  });

  it('detects yearly frequency when interval is ~365 days', () => {
    const docs = [
      makeDok({ id: '1', absender: 'KfzJahresbeitrag', betrag: 500, datum: daysAgo(370) }),
      makeDok({ id: '2', absender: 'KfzJahresbeitrag', betrag: 500, datum: daysAgo(5)   }),
    ];
    const s = buildBudgetSnapshot(docs);
    const bill = s.recurringBills.find(r => r.absender === 'KfzJahresbeitrag');
    expect(bill).toBeDefined();
    expect(bill!.frequency).toBe('jährlich');
  });

  it('ignores senders with only one document', () => {
    const docs = [makeDok({ id: '1', absender: 'EinmaligeRechnung', betrag: 999 })];
    const s = buildBudgetSnapshot(docs);
    expect(s.recurringBills.find(r => r.absender === 'EinmaligeRechnung')).toBeUndefined();
  });

  it('computes correct average betrag', () => {
    const docs = [
      makeDok({ id: '1', absender: 'Strom GmbH', betrag: 80,  datum: daysAgo(45) }),
      makeDok({ id: '2', absender: 'Strom GmbH', betrag: 100, datum: daysAgo(15) }),
    ];
    const s = buildBudgetSnapshot(docs);
    const bill = s.recurringBills.find(r => r.absender === 'Strom GmbH');
    expect(bill!.avgBetrag).toBeCloseTo(90, 1);
  });

  it('caps results at 5 recurring bills sorted by avgBetrag descending', () => {
    const docs = Array.from({ length: 7 }, (_, i) => [
      makeDok({ id: `${i}a`, absender: `Firma${i}`, betrag: (i + 1) * 50, datum: daysAgo(45) }),
      makeDok({ id: `${i}b`, absender: `Firma${i}`, betrag: (i + 1) * 50, datum: daysAgo(15) }),
    ]).flat();
    const s = buildBudgetSnapshot(docs);
    expect(s.recurringBills.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < s.recurringBills.length; i++) {
      expect(s.recurringBills[i - 1].avgBetrag).toBeGreaterThanOrEqual(s.recurringBills[i].avgBetrag);
    }
  });

  it('sets nextExpected in the future when last payment was recent', () => {
    // interval = 30 days, last payment 20 days ago → nextExpected ~10 days from now
    const docs = [
      makeDok({ id: '1', absender: 'Monatsabo', betrag: 12, datum: daysAgo(50) }),
      makeDok({ id: '2', absender: 'Monatsabo', betrag: 12, datum: daysAgo(20) }),
    ];
    const s = buildBudgetSnapshot(docs);
    const bill = s.recurringBills.find(r => r.absender === 'Monatsabo');
    expect(bill!.nextExpected).not.toBeNull();
    expect(new Date(bill!.nextExpected!).getTime()).toBeGreaterThan(Date.now());
  });
});

// ─── buildBudgetSnapshot — nextMonthEstimate ──────────────────────────────────

describe('buildBudgetSnapshot — nextMonthEstimate', () => {
  it('sums only monthly recurring bills', () => {
    // monthly: 2 docs ~30 days apart
    const monthly = [
      makeDok({ id: 'm1', absender: 'Miete', betrag: 800, datum: daysAgo(45) }),
      makeDok({ id: 'm2', absender: 'Miete', betrag: 800, datum: daysAgo(15) }),
    ];
    // quarterly: ~90 days apart — excluded from estimate
    const quarterly = [
      makeDok({ id: 'q1', absender: 'Jahresbeitrag', betrag: 200, datum: daysAgo(100) }),
      makeDok({ id: 'q2', absender: 'Jahresbeitrag', betrag: 200, datum: daysAgo(10)  }),
    ];
    const s = buildBudgetSnapshot([...monthly, ...quarterly]);
    // nextMonthEstimate should be close to 800 (monthly only)
    expect(s.nextMonthEstimate).toBeCloseTo(800, 0);
  });

  it('is 0 when no monthly recurring bills', () => {
    const docs = [
      makeDok({ id: '1', absender: 'EinmalRechnung', betrag: 500 }),
    ];
    expect(buildBudgetSnapshot(docs).nextMonthEstimate).toBe(0);
  });
});

// ─── buildBudgetSnapshot — insights ───────────────────────────────────────────

describe('buildBudgetSnapshot — insights', () => {
  it('generates no insights for empty docs', () => {
    expect(buildBudgetSnapshot([]).insights).toHaveLength(0);
  });

  it('generates anomalie insight when this month is 20%+ above average', () => {
    // 5 past months at 100€ each, current month at 200€ → +100% above avg
    const pastDocs = [1, 2, 3, 4, 5].map(i =>
      makeDok({ id: `p${i}`, betrag: 100, datum: startOfMonthsAgo(i) })
    );
    const currentDoc = makeDok({ id: 'c1', betrag: 200, datum: thisMonthDate() });
    const s = buildBudgetSnapshot([...pastDocs, currentDoc]);
    const anomalie = s.insights.find(ins => ins.type === 'anomalie');
    expect(anomalie).toBeDefined();
    expect(anomalie!.severity).toBe('hoch');
  });

  it('generates tipp insight when this month is 20%+ below average', () => {
    // 5 past months at 200€ each, current month at 50€ → −75% below avg
    const pastDocs = [1, 2, 3, 4, 5].map(i =>
      makeDok({ id: `p${i}`, betrag: 200, datum: startOfMonthsAgo(i) })
    );
    const currentDoc = makeDok({ id: 'c1', betrag: 50, datum: thisMonthDate() });
    const s = buildBudgetSnapshot([...pastDocs, currentDoc]);
    const tipp = s.insights.find(ins => ins.type === 'tipp');
    expect(tipp).toBeDefined();
    expect(tipp!.severity).toBe('info');
  });

  it('generates vorhersage insight when recurring bill is due within 14 days', () => {
    // interval = 30 days, last payment 20 days ago → nextExpected ~10 days from now (≤ 14)
    const docs = [
      makeDok({ id: 'r1', absender: 'StreamingDienst', betrag: 15, datum: daysAgo(50) }),
      makeDok({ id: 'r2', absender: 'StreamingDienst', betrag: 15, datum: daysAgo(20) }),
    ];
    const s = buildBudgetSnapshot(docs);
    const vorhersage = s.insights.find(ins => ins.type === 'vorhersage');
    expect(vorhersage).toBeDefined();
    expect(vorhersage!.text).toContain('StreamingDienst');
  });

  it('caps insights at 3', () => {
    // generate many anomalies/vorhersagen
    const pastDocs = [1, 2, 3, 4, 5].map(i =>
      makeDok({ id: `p${i}`, betrag: 100, datum: startOfMonthsAgo(i) })
    );
    // multiple recurring bills due soon
    const senders = ['A', 'B', 'C', 'D'].flatMap((name, i) => [
      makeDok({ id: `${name}1`, absender: name, betrag: 50 + i * 10, datum: daysAgo(35) }),
      makeDok({ id: `${name}2`, absender: name, betrag: 50 + i * 10, datum: daysAgo(5)  }),
    ]);
    const currentDoc = makeDok({ id: 'c1', betrag: 999, datum: thisMonthDate() }); // triggers anomalie
    const s = buildBudgetSnapshot([...pastDocs, ...senders, currentDoc]);
    expect(s.insights.length).toBeLessThanOrEqual(3);
  });
});
