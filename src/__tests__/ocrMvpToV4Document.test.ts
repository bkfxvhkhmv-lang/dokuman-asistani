jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiRemove: jest.fn(),
    clear: jest.fn(),
  },
}));

import { ocrMvpToV4Document } from '@/features/ocr-mvp/adapters/ocrMvpToV4Document';
import { workerResultToOcrMvpStatus } from '@/features/ocr-mvp/adapters/workerResultToOcrMvpStatus';
import type { OcrMvpJobStatus } from '@/services/ocrMvpApi';

function makeResult(deadline?: string | null, extra?: Partial<OcrMvpJobStatus['action_summary']>): OcrMvpJobStatus {
  return {
    job_id: 'job-1',
    status: 'done',
    document_type: 'invoice',
    confidence: 0.91,
    action_summary: {
      kind: 'invoice',
      vendor_name: 'Vodafone',
      due_date: deadline ?? null,
      ...extra,
    },
  };
}

describe('ocrMvpToV4Document deadline normalization', () => {
  it('sets v4DocId from core scan job_id', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'remote-core-uuid',
      status: 'done',
      document_type: 'invoice',
      action_summary: { kind: 'invoice', raw_text: 'text' },
    });
    expect(draft.document.v4DocId).toBe('remote-core-uuid');
    expect(draft.document.ocrJobId).toBe('remote-core-uuid');
  });

  it('parses plain DD.MM.YYYY deadline', () => {
    const draft = ocrMvpToV4Document(makeResult('12.02.2026'));
    expect(draft.document.frist).toContain('2026-02-12');
  });

  it('parses "Zahlung bis 12.02.2026"', () => {
    const draft = ocrMvpToV4Document(makeResult('Zahlung bis 12.02.2026'));
    expect(draft.document.frist).toContain('2026-02-12');
  });

  it('parses "zahlbar bis 12.02.2026"', () => {
    const draft = ocrMvpToV4Document(makeResult('zahlbar bis 12.02.2026'));
    expect(draft.document.frist).toContain('2026-02-12');
  });

  it('parses "bis zum 12.02.2026"', () => {
    const draft = ocrMvpToV4Document(makeResult('bis zum 12.02.2026'));
    expect(draft.document.frist).toContain('2026-02-12');
  });

  it('parses "fällig am 12.02.2026"', () => {
    const draft = ocrMvpToV4Document(makeResult('fällig am 12.02.2026'));
    expect(draft.document.frist).toContain('2026-02-12');
  });

  it('parses German month names like "24. Mai 2026"', () => {
    const draft = ocrMvpToV4Document(makeResult('24. Mai 2026'));
    expect(draft.document.frist).toContain('2026-05-24');
  });

  it('returns null for garbage deadline', () => {
    const draft = ocrMvpToV4Document(makeResult('garbage'));
    expect(draft.document.frist).toBeNull();
  });

  it('falls back to raw OCR text when structured deadline is missing', () => {
    const draft = ocrMvpToV4Document(makeResult(null, {
      raw_text: 'Bitte beachten Sie: Zahlung bis 12.02.2026 auf folgendes Konto.',
    }));
    expect(draft.document.frist).toContain('2026-02-12');
  });

  it('extracts Behörden sender from raw OCR text instead of staff name', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-2',
      status: 'done',
      document_type: 'letter',
      confidence: 0.88,
      action_summary: {
        kind: 'letter',
        raw_text: [
          'Kreisjugendamt Saarlouis',
          'Sachbearbeiter/in Herr Alsaleh',
          'E-Mail: hussein-alsaleh@kreis-saarlouis.de',
        ].join('\n'),
      },
    });
    expect(draft.document.absender).toBe('Kreisjugendamt Saarlouis');
  });

  it('falls back to Kreis domain when only authority email domain is visible', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-3',
      status: 'done',
      document_type: 'letter',
      confidence: 0.82,
      action_summary: {
        kind: 'letter',
        raw_text: [
          'Sachbearbeiter/in Herr Alsaleh',
          'E-Mail: hussein-alsaleh@kreis-saarlouis.de',
        ].join('\n'),
      },
    });
    expect(draft.document.absender).toBe('Kreis Saarlouis');
  });

  it('extracts invoice sender from company footer line', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-4',
      status: 'done',
      document_type: 'invoice',
      confidence: 0.84,
      action_summary: {
        kind: 'invoice',
        raw_text: [
          'Shell Deutschland GmbH',
          'Kundenservice',
          'Rechnung Nr. 123',
        ].join('\n'),
      },
    });
    expect(draft.document.absender).toBe('Shell Deutschland GmbH');
  });

  it('falls back to invoice email domain when sender fields are missing', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-5',
      status: 'done',
      document_type: 'invoice',
      confidence: 0.8,
      action_summary: {
        kind: 'invoice',
        raw_text: [
          'Kundenservice',
          'kontakt@shell.de',
          'Rechnung Nr. 123',
        ].join('\n'),
      },
    });
    expect(draft.document.absender).toBe('Shell');
  });

  it('extracts amount from OCR field value when structured invoice amount is missing', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-6',
      status: 'done',
      document_type: 'invoice',
      confidence: 0.86,
      action_summary: {
        kind: 'invoice',
        vendor_name: 'BWW Energie GmbH',
        fields: [
          { name: 'Gesamtbetrag', value: '809,68 EUR' },
        ],
      },
    });
    expect(draft.document.betrag).toBe(809.68);
  });

  it('extracts amount from OCR raw text when structured amount is missing', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-7',
      status: 'done',
      document_type: 'invoice',
      confidence: 0.83,
      action_summary: {
        kind: 'invoice',
        raw_text: [
          'BWW Energie GmbH',
          'Gesamtbetrag 809,68 EUR',
          'Rechnung Nr. 123',
        ].join('\n'),
      },
    });
    expect(draft.document.betrag).toBe(809.68);
  });

  it('extracts insurance amount from "Bitte überweisen Sie fristgerecht*: 246,18"', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-huk',
      status: 'done',
      document_type: 'insurance',
      confidence: 0.82,
      action_summary: {
        kind: 'insurance',
        raw_text: [
          'HUK24 AG',
          'Bitte überweisen Sie fristgerecht*: 246,18',
          'Bankverbindung: IBAN DE12 3456 7890 1234 56',
        ].join('\n'),
      },
    });
    expect(draft.document.betrag).toBe(246.18);
  });

  it('does not pick insurance sub-amounts instead of the transfer instruction amount', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-huk2',
      status: 'done',
      document_type: 'insurance',
      confidence: 0.82,
      action_summary: {
        kind: 'insurance',
        raw_text: [
          'HUK24 AG',
          'Haftpflicht 38,03',
          'Kasko 34,58',
          'Bitte überweisen Sie fristgerecht*: 246,18',
          'IBAN DE12 3456 7890',
        ].join('\n'),
      },
    });
    expect(draft.document.betrag).toBe(246.18);
  });

  it('extracts amount from "zu überweisen" pattern', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-huk3',
      status: 'done',
      document_type: 'insurance',
      confidence: 0.8,
      action_summary: {
        kind: 'insurance',
        raw_text: 'zu überweisen: 156,00',
      },
    });
    expect(draft.document.betrag).toBe(156.00);
  });

  it('does not persist page placeholder titles from OCR into the saved document title', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-title-page',
      status: 'done',
      document_type: 'letter',
      confidence: 0.85,
      action_summary: {
        kind: 'letter',
        title: 'page-1',
        sender: 'Jobcenter Saarlouis',
        document_date: '2026-06-13',
      },
    });
    expect(draft.document.titel).toBe('Jobcenter Saarlouis · Behördenbrief · 13.06.2026');
  });

  it('does not persist footer/contact-line OCR fragments as titles', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-title-footer',
      status: 'done',
      document_type: 'insurance',
      confidence: 0.88,
      action_summary: {
        kind: 'insurance',
        title: 'Telefonnummer für Rückfragen: 0800 123456',
        sender: 'AXA',
        document_date: '2026-06-13',
      },
    });
    expect(draft.document.titel).toBe('AXA · Versicherung · 13.06.2026');
  });

  it('persists suggested_title from worker /result as saved document titel', () => {
    const status = workerResultToOcrMvpStatus({
      job_id: 'job-suggested',
      status: 'completed',
      document: {
        suggested_title: 'Heizöllieferung Rechnung',
        document_type: 'Rechnung',
      },
      text: 'Heizöl',
    });
    const draft = ocrMvpToV4Document(status);
    expect(draft.document.titel).toBe('Heizöllieferung Rechnung');
    expect(draft.document.aiDisplayTitle).toBe('Heizöllieferung Rechnung');
  });

  it('persists AI action_summary.title as document titel and aiDisplayTitle', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-heizoel',
      status: 'done',
      document_type: 'Rechnung',
      confidence: 0.9,
      action_summary: {
        kind: 'invoice',
        title: 'Heizöllieferung Juni 2026',
        sender: 'Gebr. Alt GmbH',
        document_date: '2026-06-17',
        amount: 1929.2,
      },
    });
    expect(draft.document.titel).toBe('Heizöllieferung Juni 2026');
    expect(draft.document.aiDisplayTitle).toBe('Heizöllieferung Juni 2026');
  });

  it('maps German Rechnung document_type to invoice title builder with mined sender', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-rechnung-kind',
      status: 'done',
      document_type: 'Rechnung',
      confidence: 0.88,
      action_summary: {
        kind: 'invoice',
        raw_text: [
          'Gebr. Alt GmbH',
          'Heizöl Lieferung',
          'Gesamtbetrag 1.929,20 EUR',
        ].join('\n'),
        document_date: '2026-06-17',
        amount: 1929.2,
      },
    });
    expect(draft.document.titel).toContain('Gebr. Alt GmbH');
    expect(draft.document.titel).toContain('Rechnung');
    expect(draft.document.titel).not.toMatch(/^Dokument vom /);
  });

  it('uses fallback title only when no AI title exists', () => {
    const draft = ocrMvpToV4Document({
      job_id: 'job-fallback',
      status: 'done',
      document_type: 'unknown',
      confidence: 0.5,
      action_summary: {
        kind: 'unknown',
        document_date: '2026-06-17',
      },
    });
    expect(draft.document.titel).toBe('Dokument vom 17.06.2026');
    expect(draft.document.aiDisplayTitle).toBeUndefined();
  });

  it('sets datum to capture time, not invoice document_date', () => {
    const before = Date.now();
    const draft = ocrMvpToV4Document({
      job_id: 'job-datum',
      status: 'done',
      document_type: 'invoice',
      action_summary: {
        kind: 'invoice',
        document_date: '2020-01-15',
      },
    });
    const after = Date.now();
    const captured = new Date(draft.document.datum).getTime();
    expect(captured).toBeGreaterThanOrEqual(before);
    expect(captured).toBeLessThanOrEqual(after);
    expect(draft.document.dokumentDatum).toBe('2020-01-15');
  });
});
