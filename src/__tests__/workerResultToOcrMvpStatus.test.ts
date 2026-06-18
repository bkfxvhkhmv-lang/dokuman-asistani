import { workerResultToOcrMvpStatus, hasWorkerResultAiMeta } from '@/features/ocr-mvp/adapters/workerResultToOcrMvpStatus';
import type { BackendWorkerResult } from '@/services/v4-api/types';

function makeWorkerResult(overrides: Partial<BackendWorkerResult> = {}): BackendWorkerResult {
  return {
    job_id: 'job-remote-1',
    status: 'completed',
    confidence: 0.87,
    language: 'de',
    document: {
      suggested_title: 'Rechnung Vodafone',
      document_type: 'invoice',
      sender: 'Vodafone GmbH',
      date: '2026-02-01',
      deadline: '2026-02-15',
      amount: 49.99,
      currency: 'EUR',
      raw_text: 'Rechnung Vodafone 49,99 EUR',
    },
    action_summary: {
      kind: 'invoice',
      summary: 'Monatliche Mobilfunkrechnung',
      warnings: ['Prüfen Sie den Betrag'],
      recommended_actions: ['zahlen'],
    },
    meta: {
      provider: 'paddle',
      iban: 'DE89370400440532013000',
      processed_at: '2026-06-17T10:00:00.000Z',
    },
    ...overrides,
  };
}

describe('workerResultToOcrMvpStatus', () => {
  it('maps completed worker result to done OcrMvpJobStatus', () => {
    const mapped = workerResultToOcrMvpStatus(makeWorkerResult(), 'remote-doc-99');

    expect(mapped.status).toBe('done');
    expect(mapped.job_id).toBe('job-remote-1');
    expect(mapped.document_type).toBe('invoice');
    expect(mapped.language).toBe('de');
    expect(mapped.confidence).toBe(0.87);
    expect(mapped.provider).toBe('paddle');
    expect(mapped.needs_review).toBe(true);
    expect(mapped.action_summary).toMatchObject({
      kind: 'invoice',
      title: 'Rechnung Vodafone',
      summary: 'Monatliche Mobilfunkrechnung',
      vendor_name: 'Vodafone GmbH',
      sender: 'Vodafone GmbH',
      document_date: '2026-02-01',
      invoice_date: '2026-02-01',
      deadline: '2026-02-15',
      due_date: '2026-02-15',
      amount: 49.99,
      currency: 'EUR',
      raw_text: 'Rechnung Vodafone 49,99 EUR',
      iban: 'DE89370400440532013000',
      warnings: ['Prüfen Sie den Betrag'],
      recommended_actions: ['zahlen'],
    });
  });

  it('maps failed worker result to error status', () => {
    const mapped = workerResultToOcrMvpStatus(
      makeWorkerResult({ status: 'failed', error: 'OCR worker crashed' }),
      'remote-doc-99',
    );

    expect(mapped.status).toBe('error');
    expect(mapped.error).toBe('OCR worker crashed');
  });

  it('falls back to remoteDocId when job_id is missing', () => {
    const mapped = workerResultToOcrMvpStatus(
      makeWorkerResult({ job_id: '' }),
      'remote-doc-fallback',
    );

    expect(mapped.job_id).toBe('remote-doc-fallback');
  });
});

describe('hasWorkerResultAiMeta', () => {
  it('returns false for OCR-only snapshot (raw_text only)', () => {
    expect(hasWorkerResultAiMeta(makeWorkerResult({
      document: { raw_text: 'OCR text' },
      action_summary: {},
    }))).toBe(false);
  });

  it('returns true when suggested_title is present', () => {
    expect(hasWorkerResultAiMeta(makeWorkerResult({
      document: { suggested_title: 'Rechnung', raw_text: 'x' },
      action_summary: {},
    }))).toBe(true);
  });
});
