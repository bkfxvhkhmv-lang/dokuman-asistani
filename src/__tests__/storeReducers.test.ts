/**
 * Store reducer'lari icin regresyon testleri.
 *
 * Hedef:
 *  - Modulerlestirilmis reducer dosyalari (documents.ts, settings.ts,
 *    reducers/index.ts) eski monolithic davranisi koruyor mu?
 *  - Eklenebilen aksiyonlarin yan etkileri (versionen, etikettenVerlauf,
 *    aktifProfilId reset, vs.) bozulmadi mi?
 *
 * Hizli, izole; React Native bagimliligi yok.
 */

import { rootReducer } from '@/store/reducers';
import { INITIAL_STATE } from '@/store/initialState';
import type { StoreState, Dokument } from '@/store/types';

const baseDok = (overrides: Partial<Dokument> = {}): Dokument => ({
  id:              'd1',
  titel:           'Test',
  typ:             'Rechnung',
  absender:        'ACME',
  zusammenfassung: null,
  warnung:         null,
  betrag:          null,
  waehrung:        'EUR',
  frist:           null,
  risiko:          'niedrig',
  aktionen:        [],
  datum:           '2026-04-28T10:00:00.000Z',
  gelesen:         false,
  erledigt:        false,
  uri:             null,
  rohText:         null,
  ...overrides,
});

const blankState = (): StoreState => ({
  ...INITIAL_STATE,
  dokumente: [],
  einstellungen: { ...INITIAL_STATE.einstellungen },
  _duplikat: false,
});

/* -------------------------------------------------------------------------- */
/* DOCUMENTS                                                                  */
/* -------------------------------------------------------------------------- */

describe('documentReducer', () => {
  test('ADD_DOKUMENT en basa ekler ve duplicate flag\'ini sifirlar', () => {
    const s = blankState();
    const next = rootReducer(s, { type: 'ADD_DOKUMENT', payload: baseDok() });
    expect(next.dokumente).toHaveLength(1);
    expect(next.dokumente[0].id).toBe('d1');
    expect(next._duplikat).toBe(false);
  });

  test('ADD_DOKUMENT ayni rohText prefix\'iyle duplicate flag set eder', () => {
    const s = blankState();
    const a = baseDok({ id: 'a', rohText: 'Lorem ipsum dolor sit amet'.repeat(20) });
    const b = baseDok({ id: 'b', rohText: 'Lorem ipsum dolor sit amet'.repeat(20) });
    const after = rootReducer(rootReducer(s, { type: 'ADD_DOKUMENT', payload: a }), {
      type: 'ADD_DOKUMENT', payload: b,
    });
    expect(after.dokumente).toHaveLength(1);
    expect(after._duplikat).toBe(true);
  });

  test('UPDATE_DOKUMENT versiyonlanir alanlar degisirse versionen olusturur', () => {
    const s: StoreState = { ...blankState(), dokumente: [baseDok({ betrag: 100 })] };
    const next = rootReducer(s, {
      type: 'UPDATE_DOKUMENT',
      payload: { id: 'd1', betrag: 200 },
    });
    expect(next.dokumente[0].betrag).toBe(200);
    expect(next.dokumente[0].versionen).toHaveLength(1);
    expect(next.dokumente[0].versionen![0].felder.betrag).toBe(100);
  });

  test('UPDATE_DOKUMENT versiyonlanmaya gerek yok ise versionen olusmaz', () => {
    const s: StoreState = { ...blankState(), dokumente: [baseDok()] };
    const next = rootReducer(s, {
      type: 'UPDATE_DOKUMENT',
      payload: { id: 'd1', titel: 'Yeni baslik' },
    });
    expect(next.dokumente[0].titel).toBe('Yeni baslik');
    expect(next.dokumente[0].versionen).toBeUndefined();
  });

  test('DELETE_DOKUMENT belgeyi listeden cikarir', () => {
    const s: StoreState = {
      ...blankState(),
      dokumente: [baseDok({ id: 'a' }), baseDok({ id: 'b' })],
    };
    const next = rootReducer(s, { type: 'DELETE_DOKUMENT', id: 'a' });
    expect(next.dokumente.map(d => d.id)).toEqual(['b']);
  });

  test('MARK_ERLEDIGT / UNMARK_ERLEDIGT bayraklari toggle eder', () => {
    let s: StoreState = { ...blankState(), dokumente: [baseDok()] };
    s = rootReducer(s, { type: 'MARK_ERLEDIGT', id: 'd1' });
    expect(s.dokumente[0].erledigt).toBe(true);
    s = rootReducer(s, { type: 'UNMARK_ERLEDIGT', id: 'd1' });
    expect(s.dokumente[0].erledigt).toBe(false);
  });

  test('UPDATE_ETIKETTEN dokumenti gunceller ve etikettenVerlauf\'a yansir', () => {
    const s: StoreState = {
      ...blankState(),
      dokumente: [baseDok()],
      einstellungen: { ...blankState().einstellungen, etikettenVerlauf: ['eski'] },
    };
    const next = rootReducer(s, {
      type: 'UPDATE_ETIKETTEN',
      id: 'd1',
      etiketten: ['yeni1', 'yeni2'],
    });
    expect(next.dokumente[0].etiketten).toEqual(['yeni1', 'yeni2']);
    expect(next.einstellungen.etikettenVerlauf).toEqual(['yeni1', 'yeni2', 'eski']);
  });

  test('APPLY_ACTION_OUTCOME workflow alanlarini set eder ve history\'e ekler', () => {
    const s: StoreState = { ...blankState(), dokumente: [baseDok()] };
    const next = rootReducer(s, {
      type: 'APPLY_ACTION_OUTCOME',
      id: 'd1',
      outcome: {
        status:    'bezahlt',
        stamp:     '✓',
        label:     'Bezahlt',
        timeline:  'Heute',
        createdAt: '2026-04-28T11:00:00.000Z',
        color:     '#22C55E',
      },
    });
    expect(next.dokumente[0].workflowStatus).toBe('bezahlt');
    expect(next.dokumente[0].actionHistory).toHaveLength(1);
    expect(next.dokumente[0].actionHistory![0].label).toBe('Bezahlt');
  });
});

/* -------------------------------------------------------------------------- */
/* SETTINGS                                                                   */
/* -------------------------------------------------------------------------- */

describe('settingsReducer', () => {
  test('UPDATE_EINSTELLUNGEN partial merge yapar', () => {
    const s = blankState();
    const next = rootReducer(s, {
      type: 'UPDATE_EINSTELLUNGEN',
      payload: { sprache: 'English' },
    });
    expect(next.einstellungen.sprache).toBe('English');
    expect(next.einstellungen.benachrichtigungen).toBe(s.einstellungen.benachrichtigungen);
  });

  test('SAVE_FILTER_KOMBI ve DELETE_FILTER_KOMBI birlikte', () => {
    let s = blankState();
    s = rootReducer(s, { type: 'SAVE_FILTER_KOMBI', payload: { foo: 'bar' } });
    expect(s.einstellungen.filterKombis).toHaveLength(1);
    const id = s.einstellungen.filterKombis[0].id;
    s = rootReducer(s, { type: 'DELETE_FILTER_KOMBI', id });
    expect(s.einstellungen.filterKombis).toHaveLength(0);
  });

  test('ADD_KLASSOR_REGEL ayni absender icin ikinciyi eklemiyor', () => {
    let s = blankState();
    s = rootReducer(s, {
      type: 'ADD_KLASSOR_REGEL',
      payload: { absenderPattern: 'Finanzamt' },
    });
    s = rootReducer(s, {
      type: 'ADD_KLASSOR_REGEL',
      payload: { absenderPattern: 'Finanzamt' },
    });
    expect(s.einstellungen.klassorRegeln).toHaveLength(1);
  });

  test('DELETE_PROFIL aktif profili sifirlar', () => {
    let s = blankState();
    s = rootReducer(s, {
      type: 'ADD_PROFIL',
      payload: { id: 'p1', name: 'Bayram' },
    });
    s = rootReducer(s, { type: 'SET_AKTIF_PROFIL', id: 'p1' });
    expect(s.einstellungen.aktifProfilId).toBe('p1');
    s = rootReducer(s, { type: 'DELETE_PROFIL', id: 'p1' });
    expect(s.einstellungen.profile).toHaveLength(0);
    expect(s.einstellungen.aktifProfilId).toBeNull();
  });

  test('ADD_LERN_REGEL ayni patternin ayni felder snapshot\'iyla iki kez eklenmiyor', () => {
    let s = blankState();
    const regel = {
      id:               'r1',
      absenderPattern:  'X',
      felder:           { typ: 'Rechnung' },
      anwendungen:      0,
      erstellt:         '2026-04-28',
      label:            'X-Otomatik',
    };
    s = rootReducer(s, { type: 'ADD_LERN_REGEL', payload: regel });
    s = rootReducer(s, { type: 'ADD_LERN_REGEL', payload: regel });
    expect(s.einstellungen.lernRegeln).toHaveLength(1);
  });

  test('INCREMENT_LERN_ANWENDUNG sayaci artirir', () => {
    let s = blankState();
    s = rootReducer(s, {
      type: 'ADD_LERN_REGEL',
      payload: {
        id: 'r1', absenderPattern: 'X', felder: {}, anwendungen: 0,
        erstellt: '2026-04-28', label: 'X',
      },
    });
    s = rootReducer(s, { type: 'INCREMENT_LERN_ANWENDUNG', id: 'r1' });
    s = rootReducer(s, { type: 'INCREMENT_LERN_ANWENDUNG', id: 'r1' });
    expect(s.einstellungen.lernRegeln[0].anwendungen).toBe(2);
  });

  test('ADD_SABLON ayni dokId+sablonId varsa replace eder', () => {
    let s = blankState();
    s = rootReducer(s, {
      type: 'ADD_SABLON',
      payload: { dokId: 'd1', sablonId: 's1', meta: 'first' },
    });
    s = rootReducer(s, {
      type: 'ADD_SABLON',
      payload: { dokId: 'd1', sablonId: 's1', meta: 'second' },
    });
    expect(s.einstellungen.aktiveSablonlari).toHaveLength(1);
    expect((s.einstellungen.aktiveSablonlari[0] as any).meta).toBe('second');
  });
});

/* -------------------------------------------------------------------------- */
/* ROOT — LOAD / CLEAR_DUPLIKAT / unknown                                     */
/* -------------------------------------------------------------------------- */

describe('rootReducer cross-cutting', () => {
  test('LOAD partial merge yapar', () => {
    const s = blankState();
    const next = rootReducer(s, {
      type: 'LOAD',
      payload: { dokumente: [baseDok({ id: 'loaded' })] },
    });
    expect(next.dokumente).toHaveLength(1);
    expect(next.dokumente[0].id).toBe('loaded');
    expect(next.einstellungen).toEqual(s.einstellungen);
  });

  test('CLEAR_DUPLIKAT bayragini kapatir', () => {
    const s: StoreState = { ...blankState(), _duplikat: true };
    const next = rootReducer(s, { type: 'CLEAR_DUPLIKAT' });
    expect(next._duplikat).toBe(false);
  });

  test('Bilinmeyen action state\'i degistirmez (referans esitligi)', () => {
    const s = blankState();
    const next = rootReducer(s, { type: '__UNKNOWN__' as any });
    expect(next).toBe(s);
  });
});
