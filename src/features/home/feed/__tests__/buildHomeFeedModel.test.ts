import { buildHomeFeedModel, dedupeDocsByFingerprint, filterSectionDocs } from '@/features/home/feed/buildHomeFeedModel';
import type { HomeFeedSection } from '@/features/home/feed/homeFeedTypes';
import type { Dokument } from '@/store';

function makeDoc(partial: Partial<Dokument> & { id: string }): Dokument {
  return {
    titel: partial.titel ?? partial.id,
    typ: partial.typ ?? 'Sonstiges',
    absender: partial.absender ?? 'Unbekannt',
    datum: partial.datum ?? '2026-06-01',
    risiko: partial.risiko ?? 'niedrig',
    aktionen: [],
    erledigt: false,
    gelesen: false,
    ...partial,
  } as Dokument;
}

function section(docs: Dokument[]): HomeFeedSection {
  return { title: 'Recent', eyebrow: 'Docs', docs };
}

describe('dedupeDocsByFingerprint', () => {
  it('keeps first occurrence per typ|betrag|absender', () => {
    const a = makeDoc({ id: 'a', typ: 'Rechnung', betrag: 10, absender: 'ACME' });
    const b = makeDoc({ id: 'b', typ: 'Rechnung', betrag: 10, absender: 'ACME' });
    const c = makeDoc({ id: 'c', typ: 'Rechnung', betrag: 20, absender: 'ACME' });
    expect(dedupeDocsByFingerprint([a, b, c]).map(d => d.id)).toEqual(['a', 'c']);
  });
});

describe('filterSectionDocs', () => {
  it('drops optimistic and _duplikat flagged docs', () => {
    const docs = [
      makeDoc({ id: 'ok' }),
      makeDoc({ id: 'opt', isOptimistic: true }),
      makeDoc({ id: 'dup', _duplikat: true } as Partial<Dokument> & { id: string }),
    ];
    expect(filterSectionDocs(docs).map(d => d.id)).toEqual(['ok']);
  });
});

describe('buildHomeFeedModel', () => {
  const manyDocs = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      makeDoc({ id: `d${i}`, titel: `Doc ${i}`, absender: `Sender ${i}` }),
    );

  it('limits Dokumente tab to 6 docs by default', () => {
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: false,
      listQuery: '',
      showAll: false,
      section: section(manyDocs(12)),
    });
    expect(model.items).toHaveLength(6);
    expect(model.items.every(i => i.type === 'doc')).toBe(true);
    expect(model.showExpandAffordance).toBe(true);
    expect(model.allDocsCount).toBe(12);
    expect(model.displayedCount).toBe(6);
  });

  it('shows all docs when showAll is true', () => {
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: false,
      listQuery: '',
      showAll: true,
      section: section(manyDocs(12)),
    });
    expect(model.items).toHaveLength(12);
    expect(model.showExpandAffordance).toBe(false);
  });

  it('uses stacking mode on Aufgaben tab with limit 20', () => {
    const docs = manyDocs(25).map((d, i) => ({ ...d, absender: i < 15 ? 'SameCo' : `Co${i}` }));
    const model = buildHomeFeedModel({
      aktiv: 'Aufgaben',
      secilenModus: false,
      listQuery: '',
      showAll: false,
      section: section(docs),
    });
    expect(model.useStacking).toBe(true);
    expect(model.items.every(i => i.type === 'stack')).toBe(true);
    expect(model.items.length).toBeLessThanOrEqual(20);
    expect(model.showExpandAffordance).toBe(true);
  });

  it('search with 2+ chars bypasses initial limit', () => {
    const docs = manyDocs(10);
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: false,
      listQuery: 'doc',
      showAll: false,
      section: section(docs),
    });
    expect(model.items.length).toBeGreaterThan(6);
    expect(model.showExpandAffordance).toBe(false);
    expect(model.emptyReason).toBeNull();
  });

  it('returns search empty reason when query matches nothing', () => {
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: false,
      listQuery: 'zzznomatch',
      showAll: false,
      section: section(manyDocs(5)),
    });
    expect(model.items).toHaveLength(0);
    expect(model.emptyReason).toBe('search');
    expect(model.emptyVariant).toBe('docs');
  });

  it('returns tab-empty when section has no docs', () => {
    const model = buildHomeFeedModel({
      aktiv: 'Kalender',
      secilenModus: false,
      listQuery: '',
      showAll: false,
      section: section([]),
    });
    expect(model.emptyReason).toBe('tab-empty');
    expect(model.emptyVariant).toBe('calendar');
  });

  it('hides expand affordance in selection mode', () => {
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: true,
      listQuery: '',
      showAll: false,
      section: section(manyDocs(12)),
    });
    expect(model.showExpandAffordance).toBe(false);
  });

  it('sets hiddenByDedupe when duplicates collapsed', () => {
    const dup = makeDoc({ id: 'a', typ: 'X', betrag: 1, absender: 'Y' });
    const dup2 = makeDoc({ id: 'b', typ: 'X', betrag: 1, absender: 'Y' });
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: false,
      listQuery: '',
      showAll: false,
      section: section([dup, dup2]),
    });
    expect(model.hiddenByDedupe).toBe(true);
    expect(model.items).toHaveLength(1);
  });

  it('exposes prefetchDocIds from prefetchSource', () => {
    const prefetch = [makeDoc({ id: 'pref1' }), makeDoc({ id: 'pref2' })];
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: false,
      listQuery: '',
      showAll: false,
      section: section(manyDocs(3)),
      prefetchSource: prefetch,
    });
    expect(model.prefetchDocIds).toEqual(['pref1']);
  });

  it('assigns stable keys and indices on doc rows', () => {
    const docs = [makeDoc({ id: 'x' }), makeDoc({ id: 'y' })];
    const model = buildHomeFeedModel({
      aktiv: 'Dokumente',
      secilenModus: false,
      listQuery: '',
      showAll: true,
      section: section(docs),
    });
    expect(model.items).toEqual([
      { type: 'doc', key: 'x', dok: docs[0], index: 0 },
      { type: 'doc', key: 'y', dok: docs[1], index: 1 },
    ]);
  });
});
