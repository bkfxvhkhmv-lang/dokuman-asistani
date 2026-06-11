/**
 * D-3.3 — Nebenkosten draft persistence tests
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/types';
import { createInitialNebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/initialState';
import { nebenkostenDraftReducer } from '@/features/vermieter/nebenkosten/store/nebenkostenDraftReducer';
import {
  NK_DRAFT_STORAGE_KEY,
  clearNkDraft,
  loadNkDraft,
  saveNkDraft,
  shouldSaveNkDraft,
} from '@/features/vermieter/nebenkosten/store/persistence';

function makeSampleDraft(): NebenkostenDraftState {
  return {
    landlord: {
      id: 'landlord-1',
      name: 'Asef Karatas',
      address: {
        street: 'Zerrstr.',
        houseNumber: '13',
        postalCode: '66839',
        city: 'Schmelz',
      },
    },
    property: {
      id: 'prop-1',
      address: {
        street: 'Zerrstr.',
        houseNumber: '13',
        postalCode: '66839',
        city: 'Schmelz',
      },
      totalAreaSqm: 200,
      numberOfUnits: 4,
    },
    billingPeriod: { startDate: '2024-01-01', endDate: '2024-12-31' },
    units: [
      {
        id: 'unit-1',
        propertyId: 'prop-1',
        label: 'EG',
        areaSqm: 60,
      },
    ],
    tenancies: [
      {
        id: 'tenancy-1',
        unitId: 'unit-1',
        tenant: { id: 'tenant-1', name: 'Müller' },
        startDate: '2024-01-01',
        numberOfPersons: 2,
        monthlyPrepaymentCents: 25_000,
      },
    ],
    costPositions: [
      {
        id: 'cp-1',
        categoryKey: 'grundsteuer',
        descriptionDe: 'Grundsteuer',
        totalCents: 120_000,
        scope: 'property',
        allocationKey: { type: 'wohnflaeche' },
        includeInCalculation: true,
      },
    ],
    results: [],
    validationIssues: [],
    status: 'dirty',
    isHydrated: true,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('loadNkDraft', () => {
  it('returns null when storage empty', async () => {
    expect(await loadNkDraft()).toBeNull();
  });

  it('returns parsed state when valid JSON stored', async () => {
    const draft = makeSampleDraft();
    await saveNkDraft(draft);

    const loaded = await loadNkDraft();
    expect(loaded?.landlord).toEqual(draft.landlord);
    expect(loaded?.costPositions[0].totalCents).toBe(120_000);
    expect(loaded?.isHydrated).toBe(false);
  });

  it('returns null on corrupted JSON', async () => {
    await AsyncStorage.setItem(NK_DRAFT_STORAGE_KEY, '{bad-json');
    expect(await loadNkDraft()).toBeNull();
    expect(await AsyncStorage.getItem(NK_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('returns null on AsyncStorage error and does not throw', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('read fail'));
    await expect(loadNkDraft()).resolves.toBeNull();
  });
});

describe('saveNkDraft', () => {
  it('writes serialized state to correct key', async () => {
    const draft = makeSampleDraft();
    await saveNkDraft(draft);

    const raw = await AsyncStorage.getItem(NK_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.draft.landlord.name).toBe('Asef Karatas');
    expect(parsed.draft.isHydrated).toBeUndefined();
  });

  it('does not throw on AsyncStorage error', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('write fail'));
    await expect(saveNkDraft(makeSampleDraft())).resolves.toBeUndefined();
  });
});

describe('clearNkDraft', () => {
  it('removes correct key', async () => {
    await saveNkDraft(makeSampleDraft());
    await clearNkDraft();
    expect(await AsyncStorage.getItem(NK_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('does not throw on AsyncStorage error', async () => {
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('remove fail'));
    await expect(clearNkDraft()).resolves.toBeUndefined();
  });
});

describe('HYDRATE_DRAFT reducer action', () => {
  it('replaces state with payload and sets isHydrated true', () => {
    const initial = createInitialNebenkostenDraftState();
    const loaded = makeSampleDraft();
    loaded.isHydrated = false;

    const next = nebenkostenDraftReducer(initial, {
      type: 'HYDRATE_DRAFT',
      payload: loaded,
    });

    expect(next.landlord).toEqual(loaded.landlord);
    expect(next.status).toBe('dirty');
    expect(next.isHydrated).toBe(true);
  });
});

describe('RESET_DRAFT reducer action', () => {
  it('resets draft fields and keeps isHydrated true', () => {
    const next = nebenkostenDraftReducer(makeSampleDraft(), { type: 'RESET_DRAFT' });
    expect(next.units).toEqual([]);
    expect(next.landlord).toBeNull();
    expect(next.isHydrated).toBe(true);
  });
});

describe('pre-hydrate guard', () => {
  it('shouldSaveNkDraft is false before hydration', () => {
    expect(shouldSaveNkDraft(createInitialNebenkostenDraftState())).toBe(false);
  });

  it('shouldSaveNkDraft is true after hydration', () => {
    expect(shouldSaveNkDraft({ ...createInitialNebenkostenDraftState(), isHydrated: true })).toBe(
      true,
    );
  });
});

describe('RESET_DRAFT storage wiring', () => {
  it('clearNkDraft removes persisted draft', async () => {
    await saveNkDraft(makeSampleDraft());
    await clearNkDraft();
    expect(await loadNkDraft()).toBeNull();
  });
});

describe('EuroCents integrity', () => {
  it('keeps integer cents after JSON roundtrip', async () => {
    const draft = makeSampleDraft();
    await saveNkDraft(draft);
    const loaded = await loadNkDraft();
    expect(loaded?.costPositions[0].totalCents).toBe(120_000);
    expect(Number.isInteger(loaded?.costPositions[0].totalCents)).toBe(true);
  });
});
