import type { Dokument } from '@/store';
import { filterDokumente, sortByRecentlyCaptured } from '@/utils/search';

function makeDoc(partial: Partial<Dokument> & { id: string }): Dokument {
  return {
    titel: partial.titel ?? partial.id,
    typ: partial.typ ?? 'Sonstiges',
    absender: partial.absender ?? 'Unbekannt',
    datum: partial.datum ?? '2026-06-01T12:00:00.000Z',
    risiko: partial.risiko ?? 'niedrig',
    aktionen: [],
    erledigt: false,
    gelesen: false,
    zusammenfassung: null,
    warnung: null,
    betrag: null,
    waehrung: '€',
    frist: null,
    ...partial,
  } as Dokument;
}

describe('Zuletzt erfasst ordering', () => {
  it('sortByRecentlyCaptured puts newer saved document before older overdue document', () => {
    const olderOverdue = makeDoc({
      id: 'schornstein',
      titel: 'Schornsteinfeger',
      risiko: 'hoch',
      frist: '2026-01-01T00:00:00.000Z',
      datum: '2026-05-01T10:00:00.000Z',
      dokumentDatum: '2026-05-01',
    });
    const newerSaved = makeDoc({
      id: 'heizoel',
      titel: 'Heizöllieferung',
      risiko: 'niedrig',
      frist: '2026-12-01T00:00:00.000Z',
      datum: '2026-06-17T14:30:00.000Z',
      dokumentDatum: '2026-06-17',
    });

    const sorted = sortByRecentlyCaptured([olderOverdue, newerSaved]);
    expect(sorted.map(d => d.id)).toEqual(['heizoel', 'schornstein']);
  });

  it('erfasst_neu sort uses capture datum, not invoice dokumentDatum or deadline', () => {
    const byInvoiceDate = makeDoc({
      id: 'old-invoice-new-scan',
      risiko: 'hoch',
      frist: '2026-01-01T00:00:00.000Z',
      datum: '2026-06-17T16:00:00.000Z',
      dokumentDatum: '2020-03-01',
    });
    const byInvoiceDate2 = makeDoc({
      id: 'recent-invoice-old-scan',
      risiko: 'niedrig',
      datum: '2026-06-10T12:00:00.000Z',
      dokumentDatum: '2026-06-16',
    });

    const sorted = filterDokumente([byInvoiceDate2, byInvoiceDate], {
      sortBy: 'erfasst_neu',
      quickScope: 'alle',
    });
    expect(sorted.map(d => d.id)).toEqual(['old-invoice-new-scan', 'recent-invoice-old-scan']);
  });

  it('erfasst_neu does not apply risk/deadline priority sort', () => {
    const highRisk = makeDoc({
      id: 'urgent',
      risiko: 'hoch',
      frist: '2026-01-01T00:00:00.000Z',
      datum: '2026-05-01T10:00:00.000Z',
    });
    const lowRiskNew = makeDoc({
      id: 'fresh',
      risiko: 'niedrig',
      datum: '2026-06-17T10:00:00.000Z',
    });

    const riskSorted = filterDokumente([lowRiskNew, highRisk], {
      sortBy: 'risiko',
      quickScope: 'alle',
    });
    expect(riskSorted[0].id).toBe('urgent');

    const recentSorted = filterDokumente([lowRiskNew, highRisk], {
      sortBy: 'erfasst_neu',
      quickScope: 'alle',
    });
    expect(recentSorted[0].id).toBe('fresh');
  });
});
