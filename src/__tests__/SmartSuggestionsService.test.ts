import { runSmartSuggestions, runHomeSuggestions } from '../services/SmartSuggestionsService';
import type { Dokument } from '../store';

function makeDok(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'test-1',
    titel: 'Testdokument',
    typ: 'Rechnung',
    absender: 'Testfirma GmbH',
    zusammenfassung: null,
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

describe('runSmartSuggestions — structure', () => {
  it('always returns a SuggestionsResult with the correct shape', () => {
    const result = runSmartSuggestions(makeDok());
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.kategorien).toBeDefined();
    expect(Array.isArray(result.kategorien.kritisch)).toBe(true);
    expect(Array.isArray(result.kategorien.hoch)).toBe(true);
    expect(Array.isArray(result.kategorien.mittel)).toBe(true);
    expect(Array.isArray(result.kategorien.niedrig)).toBe(true);
  });

  it('topSuggestion is null when there are no suggestions', () => {
    // erledigt + no betrag + no frist → only "archivieren"
    const dok = makeDok({ erledigt: true, rohText: null });
    const result = runSmartSuggestions(dok);
    expect(result.topSuggestion).not.toBeNull(); // archivieren is always added
  });

  it('suggestions are sorted by score descending', () => {
    const dok = makeDok({ betrag: 500, frist: new Date(Date.now() + 86400000 * 2).toISOString() });
    const { suggestions } = runSmartSuggestions(dok);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score);
    }
  });

  it('does not return duplicate suggestion types', () => {
    const dok = makeDok({
      typ: 'Bußgeld',
      betrag: 200,
      frist: new Date(Date.now() + 86400000 * 3).toISOString(),
    });
    const { suggestions } = runSmartSuggestions(dok);
    const types = suggestions.map(s => s.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('runSmartSuggestions — payment suggestions', () => {
  it('suggests "Sofort zahlen" (kritisch) for overdue payment', () => {
    const past = new Date(Date.now() - 86400000 * 3).toISOString();
    const dok = makeDok({ betrag: 300, frist: past });
    const { suggestions } = runSmartSuggestions(dok);
    const zahlen = suggestions.find(s => s.type === 'zahlen');
    expect(zahlen).toBeDefined();
    expect(zahlen!.priority).toBe('kritisch');
    expect(zahlen!.badge).toBe('Überfällig!');
  });

  it('suggests payment with badge for deadline in ≤ 3 days', () => {
    const in2Days = new Date(Date.now() + 86400000 * 2).toISOString();
    const dok = makeDok({ betrag: 150, frist: in2Days });
    const { suggestions } = runSmartSuggestions(dok);
    const zahlen = suggestions.find(s => s.type === 'zahlen');
    expect(zahlen).toBeDefined();
    expect(zahlen!.priority).toBe('kritisch');
    expect(zahlen!.badge).toBeDefined();
  });

  it('does not suggest payment for erledigt documents', () => {
    const dok = makeDok({ betrag: 500, erledigt: true });
    const { suggestions } = runSmartSuggestions(dok);
    const zahlen = suggestions.find(s => s.type === 'zahlen');
    expect(zahlen).toBeUndefined();
  });

  it('does not suggest payment when betrag is 0', () => {
    const dok = makeDok({ betrag: 0 });
    const { suggestions } = runSmartSuggestions(dok);
    const zahlen = suggestions.find(s => s.type === 'zahlen');
    expect(zahlen).toBeUndefined();
  });
});

describe('runSmartSuggestions — Einspruch', () => {
  it('suggests Einspruch for Bußgeld', () => {
    const dok = makeDok({ typ: 'Bußgeld' });
    const { suggestions } = runSmartSuggestions(dok);
    const einspruch = suggestions.find(s => s.type === 'einspruch');
    expect(einspruch).toBeDefined();
  });

  it('suggests Einspruch for Steuerbescheid', () => {
    const dok = makeDok({ typ: 'Steuerbescheid' });
    const { suggestions } = runSmartSuggestions(dok);
    const einspruch = suggestions.find(s => s.type === 'einspruch');
    expect(einspruch).toBeDefined();
  });

  it('does not suggest Einspruch for Rechnung', () => {
    const dok = makeDok({ typ: 'Rechnung' });
    const { suggestions } = runSmartSuggestions(dok);
    const einspruch = suggestions.find(s => s.type === 'einspruch');
    expect(einspruch).toBeUndefined();
  });
});

describe('runSmartSuggestions — archivieren', () => {
  it('suggests archivieren for completed docs', () => {
    const dok = makeDok({ erledigt: true });
    const { suggestions } = runSmartSuggestions(dok);
    const arch = suggestions.find(s => s.type === 'archivieren');
    expect(arch).toBeDefined();
  });

  it('does not suggest archivieren for open docs', () => {
    const dok = makeDok({ erledigt: false });
    const { suggestions } = runSmartSuggestions(dok);
    const arch = suggestions.find(s => s.type === 'archivieren');
    expect(arch).toBeUndefined();
  });
});

describe('runSmartSuggestions — Mahnung', () => {
  it('assigns high priority to Mahnung type', () => {
    const dok = makeDok({ typ: 'Mahnung' });
    const { suggestions } = runSmartSuggestions(dok);
    const prüfen = suggestions.find(s => s.type === 'prüfen' && s.priority === 'hoch');
    expect(prüfen).toBeDefined();
  });
});

describe('runSmartSuggestions — Vertrag', () => {
  it('suggests kündigen or verlängern for Vertrag type', () => {
    const dok = makeDok({ typ: 'Vertrag' });
    const { suggestions } = runSmartSuggestions(dok);
    const vertragSugg = suggestions.find(s => s.type === 'kündigen' || s.type === 'verlängern');
    expect(vertragSugg).toBeDefined();
  });
});

describe('runHomeSuggestions', () => {
  it('returns empty array for empty docs', () => {
    expect(runHomeSuggestions([])).toEqual([]);
  });

  it('flags overdue documents as kritisch', () => {
    const past = new Date(Date.now() - 86400000 * 2).toISOString();
    const docs = [
      makeDok({ id: '1', frist: past, erledigt: false }),
      makeDok({ id: '2', frist: past, erledigt: false }),
    ];
    const result = runHomeSuggestions(docs);
    const überfällig = result.find(s => s.aktion === 'filter_überfällig');
    expect(überfällig).toBeDefined();
    expect(überfällig!.priority).toBe('kritisch');
  });

  it('reports open amounts when >= 100 €', () => {
    const docs = [
      makeDok({ id: '1', betrag: 200, erledigt: false }),
      makeDok({ id: '2', betrag: 150, erledigt: false }),
    ];
    const result = runHomeSuggestions(docs);
    const betragSugg = result.find(s => s.aktion === 'filter_offen_betrag');
    expect(betragSugg).toBeDefined();
  });

  it('does not report amount if below 100 €', () => {
    const docs = [makeDok({ id: '1', betrag: 50, erledigt: false })];
    const result = runHomeSuggestions(docs);
    const betragSugg = result.find(s => s.aktion === 'filter_offen_betrag');
    expect(betragSugg).toBeUndefined();
  });

  it('flags ungelesene only when >= 3', () => {
    const zwei = [
      makeDok({ id: '1', gelesen: false }),
      makeDok({ id: '2', gelesen: false }),
    ];
    expect(runHomeSuggestions(zwei).find(s => s.aktion === 'filter_ungelesen')).toBeUndefined();

    const drei = [
      ...zwei,
      makeDok({ id: '3', gelesen: false }),
    ];
    expect(runHomeSuggestions(drei).find(s => s.aktion === 'filter_ungelesen')).toBeDefined();
  });

  it('returns at most 5 suggestions', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const docs = Array.from({ length: 20 }, (_, i) =>
      makeDok({ id: String(i), betrag: 200, frist: past, gelesen: false, erledigt: false })
    );
    const result = runHomeSuggestions(docs);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
