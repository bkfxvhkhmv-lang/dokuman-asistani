import { ocrMvpToV4Document } from '@/features/ocr-mvp/adapters/ocrMvpToV4Document';
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
});
