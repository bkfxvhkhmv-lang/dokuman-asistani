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
});
