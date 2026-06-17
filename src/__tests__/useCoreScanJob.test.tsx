import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { BackendWorkerResult } from '@/services/v4-api/types';
import { useCoreScanJob } from '@/hooks/useCoreScanJob';

const mockUploadDocumentV4Safe = jest.fn();
const mockGetDocumentV4 = jest.fn();
const mockGetDocumentWorkerResult = jest.fn();
const mockAnalyzeDocument = jest.fn();
const mockGetOcrResult = jest.fn();

jest.mock('@/services/v4FileService', () => ({
  uploadDocumentV4Safe: (...args: unknown[]) => mockUploadDocumentV4Safe(...args),
}));

jest.mock('@/services/v4-api/documents', () => ({
  getDocumentV4: (...args: unknown[]) => mockGetDocumentV4(...args),
  getDocumentWorkerResult: (...args: unknown[]) => mockGetDocumentWorkerResult(...args),
}));

jest.mock('@/services/ocrMvpApi', () => ({
  analyzeDocument: (...args: unknown[]) => mockAnalyzeDocument(...args),
  getOcrResult: (...args: unknown[]) => mockGetOcrResult(...args),
}));

const WORKER_RESULT: BackendWorkerResult = {
  job_id: 'job-remote-1',
  status: 'completed',
  confidence: 0.9,
  language: 'de',
  document: {
    document_type: 'invoice',
    sender: 'Vodafone GmbH',
    raw_text: 'Rechnung',
  },
  action_summary: {
    kind: 'invoice',
    summary: 'Mobilfunkrechnung',
  },
};

let hookApi: ReturnType<typeof useCoreScanJob>;

function Probe() {
  hookApi = useCoreScanJob();
  return null;
}

function renderHook() {
  act(() => {
    TestRenderer.create(<Probe />);
  });
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useCoreScanJob', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUploadDocumentV4Safe.mockResolvedValue({ id: 'remote-doc-1', status: 'pending' });
    mockGetDocumentV4.mockResolvedValue({ id: 'remote-doc-1', status: 'completed' });
    mockGetDocumentWorkerResult.mockResolvedValue(WORKER_RESULT);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uploads via core API and reaches done after pending/processing/completed poll', async () => {
    renderHook();

    mockGetDocumentV4
      .mockResolvedValueOnce({ id: 'remote-doc-1', status: 'pending' })
      .mockResolvedValueOnce({ id: 'remote-doc-1', status: 'processing' })
      .mockResolvedValueOnce({ id: 'remote-doc-1', status: 'completed' });

    await act(async () => {
      await hookApi.startJob({ uri: 'file:///scan.pdf', name: 'scan.pdf', mimeType: 'application/pdf' });
    });

    expect(mockUploadDocumentV4Safe).toHaveBeenCalledWith('file:///scan.pdf', 'scan.pdf');
    expect(mockAnalyzeDocument).not.toHaveBeenCalled();
    expect(mockGetOcrResult).not.toHaveBeenCalled();
    expect(hookApi.status).toBe('processing');
    expect(hookApi.jobId).toBe('remote-doc-1');

    await flushMicrotasks();
    await act(async () => {
      jest.advanceTimersByTime(2_600);
    });
    await flushMicrotasks();
    await act(async () => {
      jest.advanceTimersByTime(2_600);
    });
    await flushMicrotasks();
    await act(async () => {
      jest.advanceTimersByTime(2_600);
    });
    await flushMicrotasks();

    expect(mockGetDocumentV4).toHaveBeenCalled();
    expect(mockGetDocumentWorkerResult).toHaveBeenCalledWith('remote-doc-1');
    expect(hookApi.status).toBe('done');
    expect(hookApi.result).toMatchObject({
      status: 'done',
      job_id: 'job-remote-1',
      document_type: 'invoice',
      action_summary: {
        vendor_name: 'Vodafone GmbH',
        summary: 'Mobilfunkrechnung',
      },
    });
  });

  it('maps failed document status to error', async () => {
    renderHook();
    mockGetDocumentV4.mockResolvedValue({ id: 'remote-doc-1', status: 'failed' });

    await act(async () => {
      await hookApi.startJob({ uri: 'file:///scan.pdf', name: 'scan.pdf' });
    });
    await flushMicrotasks();

    expect(hookApi.status).toBe('error');
    expect(hookApi.errorKind).toBe('server');
    expect(mockGetDocumentWorkerResult).not.toHaveBeenCalled();
    expect(mockAnalyzeDocument).not.toHaveBeenCalled();
  });

  it('maps upload failures to network error', async () => {
    renderHook();
    mockUploadDocumentV4Safe.mockRejectedValue(new Error('V4 File 503: unavailable'));

    await act(async () => {
      await hookApi.startJob({ uri: 'file:///scan.pdf', name: 'scan.pdf' });
    });

    expect(hookApi.status).toBe('error');
    expect(hookApi.errorKind).toBe('network');
    expect(mockGetDocumentV4).not.toHaveBeenCalled();
    expect(mockAnalyzeDocument).not.toHaveBeenCalled();
  });

  it('never calls legacy POST /documents/analyze', async () => {
    renderHook();

    await act(async () => {
      await hookApi.startJob({ uri: 'file:///scan.pdf', name: 'scan.pdf' });
    });
    await flushMicrotasks();

    expect(mockAnalyzeDocument).not.toHaveBeenCalled();
    expect(mockUploadDocumentV4Safe).toHaveBeenCalledTimes(1);
  });
});
