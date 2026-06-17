import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import type { Dokument } from '@/store';
import { useAnalyzeSavedDocument } from '../useAnalyzeSavedDocument';

const mockEnqueueV4Upload = jest.fn();
jest.mock('@/services/v4EnqueueUpload', () => ({
  enqueueV4Upload: (...args: unknown[]) => mockEnqueueV4Upload(...args),
}));

jest.mock('@/hooks/useGuestLimit', () => ({
  useGuestLimit: () => ({ gateOcr: jest.fn().mockResolvedValue(true) }),
}));

jest.mock('@/hooks/useT', () => ({
  useT: () => ({ t: (k: string) => k }),
}));

const makeDoc = (overrides: Partial<Dokument> = {}): Dokument => ({
  id: 'doc-1',
  titel: 'Unbekanntes Dokument',
  typ: 'Sonstiges',
  absender: 'Unbekannt',
  zusammenfassung: null,
  warnung: null,
  betrag: null,
  waehrung: '€',
  frist: null,
  risiko: 'niedrig',
  aktionen: [],
  datum: new Date().toISOString(),
  gelesen: false,
  erledigt: false,
  uri: 'file:///docs/doc-1.pdf',
  rohText: null,
  ...overrides,
});

describe('useAnalyzeSavedDocument', () => {
  let alertMock: jest.SpyInstance;

  beforeEach(() => {
    mockEnqueueV4Upload.mockClear();
    alertMock = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((b) => b.text === 'Analysieren');
      if (confirm?.onPress) {
        confirm.onPress();
      }
    });
  });

  afterEach(() => {
    alertMock.mockRestore();
  });

  it('uploads to the new core-api backend, not the legacy OCR MVP', async () => {
    const dispatch = jest.fn();
    const doc = makeDoc({ dateiName: 'rechnung.pdf' });
    let startAnalyzeRef: (() => Promise<void>) | null = null;

    function Harness() {
      const { startAnalyze } = useAnalyzeSavedDocument(doc, dispatch);
      React.useEffect(() => {
        startAnalyzeRef = startAnalyze;
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    expect(startAnalyzeRef).not.toBeNull();
    await act(async () => {
      await startAnalyzeRef!();
    });

    expect(mockEnqueueV4Upload).toHaveBeenCalledTimes(1);

    const [disp, localId, fileUri, filename, options] = mockEnqueueV4Upload.mock.calls[0];

    expect(disp).toBe(dispatch);
    expect(localId).toBe('doc-1');
    expect(fileUri).toBe('file:///docs/doc-1.pdf');
    expect(filename).toBe('rechnung.pdf');
    expect(options).toEqual({ suppressAlert: true });
  });

  it('is not eligible when rohText already exists', async () => {
    const dispatch = jest.fn();
    const doc = makeDoc({ rohText: ' bereits analysiert ' });
    let startAnalyzeRef: (() => Promise<void>) | null = null;

    function Harness() {
      const { startAnalyze } = useAnalyzeSavedDocument(doc, dispatch);
      React.useEffect(() => {
        startAnalyzeRef = startAnalyze;
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    await act(async () => {
      await startAnalyzeRef!();
    });

    expect(mockEnqueueV4Upload).not.toHaveBeenCalled();
  });
});
