jest.mock('@/services/v4-api/documents', () => ({
  getDocumentWorkerResult: jest.fn(),
}));

import {
  shouldLabel,
  labelDocumentFromBackendResult,
  fetchBackendLabel,
} from '@/services/AiLabelerService';
import { getDocumentWorkerResult } from '@/services/v4-api/documents';
import {
  AiLabelResponseSchema,
  parseAiLabelResponse,
} from '@/utils/aiLabelSchema';

const mockedGetResult = getDocumentWorkerResult as jest.Mock;

// ── shouldLabel guard ──────────────────────────────────────────────────────────

describe('shouldLabel — trigger guard', () => {
  const base = {
    typ: 'Formular',
    absender: 'Unbekannt',
    titel: 'Formular',
    rohText: 'Überweisungsschein\nMRT Lendenwirbelsäule\nDiagnose: Rückenschmerzen',
    aiLabelledAt: undefined,
    confidence: 55,
  };

  it('returns true for Formular with weak sender and generic title', () => {
    expect(shouldLabel(base)).toBe(true);
  });

  it('returns false when aiLabelledAt is set (cached — do not call again)', () => {
    expect(shouldLabel({ ...base, aiLabelledAt: '2026-06-01T12:00:00Z' })).toBe(false);
  });

  it('returns false when rohText is empty (nothing to analyse)', () => {
    expect(shouldLabel({ ...base, rohText: undefined })).toBe(false);
    expect(shouldLabel({ ...base, rohText: '   ' })).toBe(false);
  });

  it('returns false for strong deterministic result (specific type + sender + title)', () => {
    expect(shouldLabel({
      typ: 'Steuerbescheid',
      absender: 'Finanzamt München',
      titel: 'Einkommensteuerbescheid 2025',
      rohText: 'Finanzamt München\nEinkommensteuerbescheid 2025',
      aiLabelledAt: undefined,
      confidence: 90,
    })).toBe(false);
  });

  it('returns true when type is strong but sender is Unbekannt', () => {
    expect(shouldLabel({
      ...base,
      typ: 'Rechnung',
      titel: 'Rechnung vom 01.06.2026',
    })).toBe(true);
  });
});

// ── labelDocumentFromBackendResult ────────────────────────────────────────────

describe('labelDocumentFromBackendResult', () => {
  const backendResult = {
    confidence: 0.85,
    document: {
      suggested_title: 'Schornsteinfeger Rechnung',
      document_type: 'Rechnung',
      sender: 'Schornsteinfeger Meisterbetrieb',
      raw_text: 'Rechnung 2026',
    },
    action_summary: {
      short_summary: 'Jahresabrechnung Schornsteinfeger.',
    },
  };

  it('maps backend worker result to AiLabelerResult', () => {
    const result = labelDocumentFromBackendResult(backendResult as any);
    expect(result).not.toBeNull();
    expect(result!.response.displayTitle).toBe('Schornsteinfeger Rechnung');
    expect(result!.response.documentType).toBe('Rechnung');
    expect(result!.response.confidence).toBe(85);
    expect(result!.usable).toBe(true);
  });

  it('normalizes 0..1 confidence to 0..100', () => {
    const result = labelDocumentFromBackendResult({
      ...backendResult,
      confidence: 0.45,
    } as any);
    expect(result!.response.confidence).toBe(45);
    expect(result!.usable).toBe(false);
  });

  it('returns null when title or type missing', () => {
    expect(labelDocumentFromBackendResult({
      confidence: 0.9,
      document: { suggested_title: '', document_type: 'Rechnung' },
    } as any)).toBeNull();
  });
});

describe('fetchBackendLabel', () => {
  beforeEach(() => {
    mockedGetResult.mockReset();
  });

  it('fetches GET /result and maps response', async () => {
    mockedGetResult.mockResolvedValue({
      confidence: 0.9,
      document: {
        suggested_title: 'Mahnung',
        document_type: 'Mahnung',
        sender: 'Vodafone',
      },
    });
    const result = await fetchBackendLabel('remote-abc');
    expect(mockedGetResult).toHaveBeenCalledWith('remote-abc');
    expect(result!.response.displayTitle).toBe('Mahnung');
  });

  it('returns null on fetch failure', async () => {
    mockedGetResult.mockRejectedValue(new Error('network'));
    expect(await fetchBackendLabel('remote-abc')).toBeNull();
  });
});

// ── AiLabelResponseSchema validation ─────────────────────────────────────────

describe('AiLabelResponseSchema — JSON validation', () => {
  const valid = {
    displayTitle: 'MRT-Überweisung',
    documentType: 'MRT-Überweisung',
    sender: 'Dr. Müller Radiologie',
    shortSummary: 'Überweisung für MRT der Lendenwirbelsäule.',
    confidence: 85,
    needsUserConfirmation: false,
    reason: 'Text enthält Überweisungsschein und MRT.',
  };

  it('accepts a valid label response', () => {
    const result = AiLabelResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects confidence > 100', () => {
    expect(AiLabelResponseSchema.safeParse({ ...valid, confidence: 101 }).success).toBe(false);
  });
});

// ── parseAiLabelResponse ──────────────────────────────────────────────────────

describe('parseAiLabelResponse', () => {
  const jsonString = JSON.stringify({
    displayTitle: 'MRT-Überweisung',
    documentType: 'MRT-Überweisung',
    sender: 'Radiologie Praxis',
    shortSummary: 'MRT der Lendenwirbelsäule.',
    confidence: 82,
    needsUserConfirmation: false,
    reason: 'Überweisungsschein mit MRT erkannt.',
  });

  it('parses valid bare JSON string', () => {
    expect(parseAiLabelResponse(jsonString)).not.toBeNull();
  });

  it('returns null for non-JSON response', () => {
    expect(parseAiLabelResponse('Ich kann das nicht erkennen.')).toBeNull();
  });
});
