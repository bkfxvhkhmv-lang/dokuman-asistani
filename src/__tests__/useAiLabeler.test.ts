import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { Dokument } from '@/store';
import { useAiLabeler } from '@/hooks/useAiLabeler';

jest.mock('expo-haptics', () => ({}));

const mockDispatch = jest.fn();

jest.mock('@/services/AiLabelerService', () => ({
  shouldLabel: jest.fn(() => true),
  fetchBackendLabel: jest.fn(),
}));

jest.mock('@/services/v4EnqueueUpload', () => ({
  enqueueV4Upload: jest.fn(),
}));

jest.mock('@/services/v4DocumentJobPoll', () => ({
  attachV4JobPolling: jest.fn(),
}));

jest.mock('@/features/detail/utils/buildAnalyseFileFromDocument', () => ({
  buildAnalyseFileFromDocument: jest.fn(),
}));

jest.mock('@/store/Provider', () => ({
  useStoreDispatch: () => mockDispatch,
}));

jest.mock('@/i18n/langStore', () => ({
  getLangSync: () => 'de',
}));

jest.mock('@/i18n/translations', () => ({
  t: (_lang: string, key: string) => key,
}));

import { shouldLabel, fetchBackendLabel } from '@/services/AiLabelerService';
import { attachV4JobPolling } from '@/services/v4DocumentJobPoll';
import { enqueueV4Upload } from '@/services/v4EnqueueUpload';

const mockedShouldLabel = shouldLabel as jest.Mock;
const mockedFetchBackendLabel = fetchBackendLabel as jest.Mock;
const mockedAttachPolling = attachV4JobPolling as jest.Mock;
const mockedEnqueue = enqueueV4Upload as jest.Mock;

function makeDok(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'local-1',
    titel: 'Formular',
    typ: 'Formular',
    absender: 'Unbekannt',
    risiko: 'niedrig',
    rohText: 'OCR text',
    confidence: 55,
    ...overrides,
  } as Dokument;
}

let labelerApi: ReturnType<typeof useAiLabeler>;

function Probe({ dok }: { dok: Dokument }) {
  labelerApi = useAiLabeler(dok);
  return null;
}

function renderLabeler(dok: Dokument) {
  act(() => {
    TestRenderer.create(React.createElement(Probe, { dok }));
  });
}

describe('useAiLabeler — core-api migration (#139)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedShouldLabel.mockReturnValue(true);
  });

  it('uses fetchBackendLabel when v4DocId is completed', async () => {
    mockedFetchBackendLabel.mockResolvedValue({
      response: {
        displayTitle: 'Schornsteinfeger Rechnung',
        documentType: 'Rechnung',
        sender: 'Schornsteinfeger',
        shortSummary: '',
        confidence: 85,
        needsUserConfirmation: false,
        reason: '',
      },
      usable: true,
    });

    const dok = makeDok({ v4DocId: 'remote-1', v4JobStatus: 'completed' });
    renderLabeler(dok);

    await act(async () => {
      await labelerApi.triggerLabel();
    });

    expect(mockedFetchBackendLabel).toHaveBeenCalledWith('remote-1');
    expect(mockedEnqueue).not.toHaveBeenCalled();
    expect(labelerApi.suggestion?.response.displayTitle).toBe('Schornsteinfeger Rechnung');
  });

  it('attaches polling with suppressResultApply when job is processing', async () => {
    const dok = makeDok({ v4DocId: 'remote-2', v4JobStatus: 'processing' });
    renderLabeler(dok);

    await act(async () => {
      await labelerApi.triggerLabel();
    });

    expect(mockedAttachPolling).toHaveBeenCalledWith(
      mockDispatch,
      'local-1',
      'remote-2',
      expect.objectContaining({ suppressResultApply: true }),
    );
  });

  it('acceptSuggestion writes customTitle, not titel', async () => {
    mockedFetchBackendLabel.mockResolvedValue({
      response: {
        displayTitle: 'Benutzer Titel',
        documentType: 'Rechnung',
        sender: null,
        shortSummary: '',
        confidence: 90,
        needsUserConfirmation: false,
        reason: '',
      },
      usable: true,
    });

    const dok = makeDok({
      v4DocId: 'remote-1',
      v4JobStatus: 'completed',
      titel: 'Sonstiges — Unbekannt',
    });
    renderLabeler(dok);

    await act(async () => {
      await labelerApi.triggerLabel();
    });

    act(() => {
      labelerApi.acceptSuggestion();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_DOKUMENT',
      payload: expect.objectContaining({
        id: 'local-1',
        customTitle: 'Benutzer Titel',
      }),
    });
    const payload = mockDispatch.mock.calls[0][0].payload;
    expect(payload.titel).toBeUndefined();
    expect(payload.aiDisplayTitle).toBeUndefined();
  });

  it('does not trigger backend when shouldLabel is false', async () => {
    mockedShouldLabel.mockReturnValue(false);
    const dok = makeDok({ v4DocId: 'remote-3', v4JobStatus: 'completed' });
    renderLabeler(dok);

    expect(labelerApi.isEligible).toBe(false);
    await act(async () => {
      await labelerApi.triggerLabel();
    });

    expect(mockedFetchBackendLabel).not.toHaveBeenCalled();
  });
});
