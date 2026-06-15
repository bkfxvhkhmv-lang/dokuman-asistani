/**
 * Unit tests for the individual factor scoring functions and labels.
 * Each function is tested at every documented boundary to catch
 * regression when thresholds or weights are changed.
 */
import {
  scoreFristFaktor,
  scoreBetragFaktor,
  scoreTypFaktor,
  scoreVollständigkeitFaktor,
} from '@/services/smart-risk-engine/factors';
import { scoreToLevel } from '@/services/smart-risk-engine/labels';
import { calculateTrend } from '@/services/smart-risk-engine/trend';
import type { Dokument } from '@/store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDok(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'x',
    titel: 'Test',
    typ: 'Rechnung',
    absender: 'TestFirma',
    zusammenfassung: 'Eine Zusammenfassung',
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

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// ─── scoreFristFaktor ─────────────────────────────────────────────────────────

describe('scoreFristFaktor', () => {
  it('returns score 20 and kategorie "frist" when frist is null', () => {
    const f = scoreFristFaktor(makeDok({ frist: null }));
    expect(f.kategorie).toBe('frist');
    expect(f.score).toBe(20);
    expect(f.id).toBe('frist_fehlt');
  });

  it('returns score 100 for overdue deadline (frist < today)', () => {
    const f = scoreFristFaktor(makeDok({ frist: daysFromNow(-5) }));
    expect(f.score).toBe(100);
    expect(f.id).toBe('frist_abgelaufen');
  });

  it('returns score 95 for deadline today', () => {
    // daysFromNow(0) is technically today — getTageVerbleibend returns 0
    const today = new Date();
    today.setHours(12, 0, 0, 0); // midday to avoid floating rounding
    const f = scoreFristFaktor(makeDok({ frist: today.toISOString() }));
    expect(f.score).toBe(95);
    expect(f.id).toBe('frist_heute');
  });

  it('returns score 90 for deadline in 1 day', () => {
    const f = scoreFristFaktor(makeDok({ frist: daysFromNow(1) }));
    expect(f.score).toBe(90);
    expect(f.id).toBe('frist_2tage');
  });

  it('returns score 90 for deadline in 2 days (boundary)', () => {
    const f = scoreFristFaktor(makeDok({ frist: daysFromNow(2) }));
    expect(f.score).toBe(90);
    expect(f.id).toBe('frist_2tage');
  });

  it('returns score 70 for deadline in 7 days', () => {
    const f = scoreFristFaktor(makeDok({ frist: daysFromNow(7) }));
    expect(f.score).toBe(70);
    expect(f.id).toBe('frist_woche');
  });

  it('returns score 45 for deadline in 14 days', () => {
    const f = scoreFristFaktor(makeDok({ frist: daysFromNow(14) }));
    expect(f.score).toBe(45);
    expect(f.id).toBe('frist_2wochen');
  });

  it('returns score 20 for deadline in 30 days', () => {
    const f = scoreFristFaktor(makeDok({ frist: daysFromNow(30) }));
    expect(f.score).toBe(20);
    expect(f.id).toBe('frist_monat');
  });

  it('returns score 5 for deadline beyond 30 days', () => {
    const f = scoreFristFaktor(makeDok({ frist: daysFromNow(60) }));
    expect(f.score).toBe(5);
    expect(f.id).toBe('frist_ok');
  });

  it('score increases as deadline approaches (monotonic)', () => {
    const far    = scoreFristFaktor(makeDok({ frist: daysFromNow(60) }));
    const month  = scoreFristFaktor(makeDok({ frist: daysFromNow(20) }));
    const week   = scoreFristFaktor(makeDok({ frist: daysFromNow(7)  }));
    const urgent = scoreFristFaktor(makeDok({ frist: daysFromNow(1)  }));
    const overdue= scoreFristFaktor(makeDok({ frist: daysFromNow(-1) }));
    expect(far.score).toBeLessThan(month.score);
    expect(month.score).toBeLessThan(week.score);
    expect(week.score).toBeLessThan(urgent.score);
    expect(urgent.score).toBeLessThan(overdue.score);
  });
});

// ─── scoreBetragFaktor ────────────────────────────────────────────────────────

describe('scoreBetragFaktor', () => {
  it('returns score 0 for null betrag', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: null }));
    expect(f.score).toBe(0);
    expect(f.id).toBe('betrag_0');
  });

  it('returns score 0 for betrag = 0', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: 0 }));
    expect(f.score).toBe(0);
  });

  it('returns score 10 for small amount (< 200€)', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: 50 }));
    expect(f.score).toBe(10);
    expect(f.id).toBe('betrag_gering');
  });

  it('returns score 35 for medium amount (200–999€)', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: 200 }));
    expect(f.score).toBe(35);
    expect(f.id).toBe('betrag_mittel');
  });

  it('returns score 35 for 999€ (just below high threshold)', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: 999 }));
    expect(f.score).toBe(35);
  });

  it('returns score 65 for high amount (1000–4999€)', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: 1000 }));
    expect(f.score).toBe(65);
    expect(f.id).toBe('betrag_hoch');
  });

  it('returns score 85 for very high amount (≥ 5000€)', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: 5000 }));
    expect(f.score).toBe(85);
    expect(f.id).toBe('betrag_sehr_hoch');
  });

  it('returns score 85 for extreme amount (10 000€)', () => {
    const f = scoreBetragFaktor(makeDok({ betrag: 10000 }));
    expect(f.score).toBe(85);
  });
});

// ─── scoreTypFaktor ───────────────────────────────────────────────────────────

describe('scoreTypFaktor', () => {
  const cases: Array<[string, number]> = [
    ['Mahnung',          85],
    ['Bußgeld',          80],
    ['Steuerbescheid',   65],
    ['Kündigung',        60],
    ['Behördenbescheid', 55],
    ['Rechnung',         30],
    ['Termin',           25],
    ['Vertrag',          20],
    ['Versicherung',     15],
    ['Sonstiges',        10],
  ];

  test.each(cases)('%s → score %d', (typ, expectedScore) => {
    const f = scoreTypFaktor(makeDok({ typ }));
    expect(f.score).toBe(expectedScore);
    expect(f.kategorie).toBe('typ');
    expect(f.gewicht).toBe(20);
  });

  it('returns score 10 for unknown document type', () => {
    const f = scoreTypFaktor(makeDok({ typ: 'UnbekannterTyp' }));
    expect(f.score).toBe(10);
  });

  it('Mahnung has highest typ score', () => {
    const mahnung = scoreTypFaktor(makeDok({ typ: 'Mahnung' }));
    const rechnung = scoreTypFaktor(makeDok({ typ: 'Rechnung' }));
    expect(mahnung.score).toBeGreaterThan(rechnung.score);
  });
});

// ─── scoreVollständigkeitFaktor ───────────────────────────────────────────────

describe('scoreVollständigkeitFaktor', () => {
  it('returns score 0 for fully complete document', () => {
    const dok = makeDok({
      absender: 'Real GmbH',
      typ: 'Rechnung',
      risiko: 'mittel',
      betrag: 100,
      frist: daysFromNow(10),
      zusammenfassung: 'Text',
    });
    const f = scoreVollständigkeitFaktor(dok);
    expect(f.score).toBe(0);
    expect(f.id).toBe('vollst_gut');
  });

  it('returns score 20 when exactly one important field is missing', () => {
    // betrag missing
    const dok = makeDok({
      absender: 'Real GmbH',
      typ: 'Rechnung',
      risiko: 'mittel',
      betrag: null,
      frist: daysFromNow(10),
      zusammenfassung: 'Text',
    });
    const f = scoreVollständigkeitFaktor(dok);
    expect(f.score).toBe(20);
    expect(f.id).toBe('vollst_ok');
  });

  it('returns score 45 when 2+ important fields are missing', () => {
    const dok = makeDok({
      absender: 'Real GmbH',
      typ: 'Rechnung',
      risiko: 'mittel',
      betrag: null,
      frist: null,
      zusammenfassung: null,
    });
    const f = scoreVollständigkeitFaktor(dok);
    expect(f.score).toBe(45);
    expect(f.id).toBe('vollst_mittel');
  });

  it('returns score 75 for document missing 2+ mandatory fields', () => {
    const dok = makeDok({
      absender: 'Unbekannter Absender', // triggers "fehlt"
      typ: 'Sonstiges',                 // triggers "fehlt"
      risiko: 'niedrig',
    });
    const f = scoreVollständigkeitFaktor(dok);
    expect(f.score).toBe(75);
    expect(f.id).toBe('vollst_schlecht');
  });

  it('returns score 45 when typ is "Sonstiges" (one pflicht field missing)', () => {
    const dok = makeDok({
      absender: 'Echte GmbH',
      typ: 'Sonstiges',
      risiko: 'mittel',
      betrag: null,
      frist: null,
    });
    const f = scoreVollständigkeitFaktor(dok);
    // 1 Pflicht fehlt + 2 Wichtig fehlen → vollst_mittel
    expect(f.score).toBe(45);
  });
});

// ─── scoreToLevel ─────────────────────────────────────────────────────────────

describe('scoreToLevel', () => {
  const cases: Array<[number, string]> = [
    [0,   'kein'],
    [9,   'kein'],
    [10,  'niedrig'],
    [34,  'niedrig'],
    [35,  'mittel'],
    [59,  'mittel'],
    [60,  'hoch'],
    [79,  'hoch'],
    [80,  'kritisch'],
    [100, 'kritisch'],
  ];

  test.each(cases)('score %d → level "%s"', (score, level) => {
    expect(scoreToLevel(score)).toBe(level);
  });
});

// ─── calculateTrend ───────────────────────────────────────────────────────────

describe('calculateTrend', () => {
  it('returns "worse" when deadline is overdue', () => {
    const dok = makeDok({ frist: daysFromNow(-1) });
    expect(calculateTrend(dok, 50)).toBe('worse');
  });

  it('returns "worse" when deadline is today or within 3 days', () => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    expect(calculateTrend(makeDok({ frist: today.toISOString() }), 40)).toBe('worse');
    expect(calculateTrend(makeDok({ frist: daysFromNow(3) }), 40)).toBe('worse');
  });

  it('returns "stable" when deadline is more than 14 days away', () => {
    const dok = makeDok({ frist: daysFromNow(30) });
    expect(calculateTrend(dok, 40)).toBe('stable');
  });

  it('returns "better" when erledigt and no frist', () => {
    const dok = makeDok({ erledigt: true, frist: null });
    expect(calculateTrend(dok, 10)).toBe('better');
  });

  it('returns "worse" when no frist but score > 70', () => {
    const dok = makeDok({ frist: null, erledigt: false });
    expect(calculateTrend(dok, 75)).toBe('worse');
  });

  it('returns "stable" when no frist and score ≤ 70', () => {
    const dok = makeDok({ frist: null, erledigt: false });
    expect(calculateTrend(dok, 70)).toBe('stable');
  });
});
