import { attachV4JobPolling } from '@/services/v4DocumentJobPoll';
import type { BackendWorkerResult } from '@/services/v4-api/types';
import { WORKER_RESULT_META_RETRY_MAX } from '@/features/ocr-mvp/adapters/workerResultToOcrMvpStatus';

const mockGetDocumentV4 = jest.fn();
const mockGetDocumentWorkerResult = jest.fn();

jest.mock('@/services/v4-api/documents', () => ({
  getDocumentV4: (...args: unknown[]) => mockGetDocumentV4(...args),
  getDocumentWorkerResult: (...args: unknown[]) => mockGetDocumentWorkerResult(...args),
}));

const OCR_ONLY: BackendWorkerResult = {
  job_id: 'remote-1',
  status: 'completed',
  confidence: 0.9,
  document: { raw_text: 'OCR text' },
  action_summary: {},
};

const ENRICHED: BackendWorkerResult = {
  ...OCR_ONLY,
  document: {
    suggested_title: 'Rechnung',
    document_type: 'Rechnung',
    raw_text: 'OCR text',
  },
  action_summary: { summary: 'Zahlung fällig' },
};

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('attachV4JobPolling meta retry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockGetDocumentV4.mockResolvedValue({ id: 'remote-1', status: 'completed' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries /result when completed but AI meta is empty', async () => {
    mockGetDocumentWorkerResult
      .mockResolvedValueOnce(OCR_ONLY)
      .mockResolvedValueOnce(ENRICHED);

    const dispatch = jest.fn();
    attachV4JobPolling(dispatch, 'local-1', 'remote-1');
    await flushPromises();

    expect(mockGetDocumentWorkerResult).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPDATE_DOKUMENT',
        payload: expect.objectContaining({ v4JobStatus: 'completed' }),
      }),
    );

    await jest.advanceTimersByTimeAsync(1_500);
    await flushPromises();

    expect(mockGetDocumentWorkerResult).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPDATE_DOKUMENT',
        payload: expect.objectContaining({
          id: 'local-1',
          aiDisplayTitle: 'Rechnung',
        }),
      }),
    );
  });

  it('applies OCR-only update after meta retry cap', async () => {
    mockGetDocumentWorkerResult.mockResolvedValue(OCR_ONLY);

    const dispatch = jest.fn();
    attachV4JobPolling(dispatch, 'local-1', 'remote-1');
    await flushPromises();

    for (let i = 0; i < WORKER_RESULT_META_RETRY_MAX; i += 1) {
      await jest.advanceTimersByTimeAsync(1_500);
      await flushPromises();
    }

    expect(mockGetDocumentWorkerResult.mock.calls.length).toBeGreaterThanOrEqual(
      WORKER_RESULT_META_RETRY_MAX + 1,
    );
    const updates = dispatch.mock.calls
      .map(c => c[0]?.payload)
      .filter(p => p?.rohText);
    expect(updates.some(p => p.rohText === 'OCR text')).toBe(true);
    expect(updates.some(p => p.aiDisplayTitle)).toBe(false);
  });

  it('does not re-dispatch UPDATE_DOKUMENT when status is unchanged across ticks', async () => {
    // API always returns 'processing' — same status every tick.
    mockGetDocumentV4.mockResolvedValue({ id: 'remote-1', status: 'processing' });
    mockGetDocumentWorkerResult.mockResolvedValue(ENRICHED);

    const dispatch = jest.fn();
    attachV4JobPolling(dispatch, 'local-1', 'remote-1');
    await flushPromises();

    const statusDispatches = () =>
      dispatch.mock.calls.filter(
        c => c[0]?.type === 'UPDATE_DOKUMENT' && c[0]?.payload?.v4JobStatus,
      );

    // After first tick: exactly one status dispatch ('processing').
    expect(statusDispatches()).toHaveLength(1);
    expect(statusDispatches()[0][0].payload.v4JobStatus).toBe('processing');

    // Advance 3 more ticks — same 'processing' status returned each time.
    for (let i = 0; i < 3; i += 1) {
      await jest.advanceTimersByTimeAsync(2_600);
      await flushPromises();
    }

    // Still exactly one status dispatch — dirty check suppressed the rest.
    expect(statusDispatches()).toHaveLength(1);
  });
});
