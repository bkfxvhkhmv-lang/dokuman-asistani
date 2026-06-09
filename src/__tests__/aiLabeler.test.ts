// chatWithDocument uses AsyncStorage (native module) — mock the whole v4Api module
// so the service can be tested without React Native infrastructure.
jest.mock('@/services/v4Api', () => ({
  chatWithDocument: jest.fn(),
}));

import {
  shouldLabel,
  buildLabelExcerpt,
  buildLabelPrompt,
} from '@/services/AiLabelerService';
import {
  AiLabelResponseSchema,
  parseAiLabelResponse,
} from '@/utils/aiLabelSchema';

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

  it('works without v4DocId — uses local dok.id like BelgeChatModal', () => {
    // shouldLabel no longer requires v4DocId; backend is called with dok.id
    expect(shouldLabel({ ...base })).toBe(true);
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

  it('returns true when type is Sonstiges', () => {
    expect(shouldLabel({ ...base, typ: 'Sonstiges', absender: 'Testfirma GmbH', titel: 'Bestätigung' })).toBe(true);
  });

  it('returns true for empty type', () => {
    expect(shouldLabel({ ...base, typ: '' })).toBe(true);
  });
});

// ── buildLabelExcerpt ─────────────────────────────────────────────────────────

describe('buildLabelExcerpt', () => {
  it('strips blank lines', () => {
    const result = buildLabelExcerpt('Line1\n\n\nLine2\n\n');
    expect(result).toBe('Line1\nLine2');
  });

  it('caps at 80 lines', () => {
    const manyLines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');
    const result = buildLabelExcerpt(manyLines);
    expect(result.split('\n').length).toBe(80);
  });

  it('caps at 2500 chars', () => {
    const longLine = 'A'.repeat(100);
    const manyLines = Array.from({ length: 30 }, () => longLine).join('\n');
    const result = buildLabelExcerpt(manyLines);
    expect(result.length).toBeLessThanOrEqual(2500);
  });

  it('filters single-char noise lines', () => {
    const result = buildLabelExcerpt('A\nGültig\nB\nAbsender');
    expect(result).not.toContain('\nA\n');
  });
});

// ── buildLabelPrompt ──────────────────────────────────────────────────────────

describe('buildLabelPrompt', () => {
  it('includes current classification context', () => {
    const prompt = buildLabelPrompt('OCR text', 'Formular', 'Formular', 'Unbekannt');
    expect(prompt).toContain('Formular');
    expect(prompt).toContain('Unbekannt');
    expect(prompt).toContain('OCR text');
  });

  it('includes JSON schema structure', () => {
    const prompt = buildLabelPrompt('text', 'T', 'T', 'S');
    expect(prompt).toContain('"displayTitle"');
    expect(prompt).toContain('"documentType"');
    expect(prompt).toContain('"confidence"');
    expect(prompt).toContain('"needsUserConfirmation"');
  });

  it('mentions MRT-Überweisung rule', () => {
    const prompt = buildLabelPrompt('text', 'T', 'T', 'S');
    expect(prompt).toContain('MRT-Überweisung');
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

  it('accepts null sender', () => {
    const result = AiLabelResponseSchema.safeParse({ ...valid, sender: null });
    expect(result.success).toBe(true);
  });

  it('rejects missing displayTitle', () => {
    const { displayTitle: _, ...without } = valid;
    expect(AiLabelResponseSchema.safeParse(without).success).toBe(false);
  });

  it('rejects confidence > 100', () => {
    expect(AiLabelResponseSchema.safeParse({ ...valid, confidence: 101 }).success).toBe(false);
  });

  it('rejects confidence < 0', () => {
    expect(AiLabelResponseSchema.safeParse({ ...valid, confidence: -1 }).success).toBe(false);
  });

  it('rejects displayTitle longer than 120 chars', () => {
    const longTitle = 'A'.repeat(121);
    expect(AiLabelResponseSchema.safeParse({ ...valid, displayTitle: longTitle }).success).toBe(false);
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

  it('parses JSON embedded in prose/markdown', () => {
    const withProse = `Hier ist das Ergebnis:\n\n\`\`\`json\n${jsonString}\n\`\`\``;
    expect(parseAiLabelResponse(withProse)).not.toBeNull();
  });

  it('returns null for non-JSON response', () => {
    expect(parseAiLabelResponse('Ich kann das nicht erkennen.')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseAiLabelResponse('{ "displayTitle": "Test", broken }')).toBeNull();
  });

  it('returns null for JSON that fails schema validation', () => {
    expect(parseAiLabelResponse('{ "displayTitle": "T", "confidence": 999 }')).toBeNull();
  });

  it('low confidence result is parsed but usable=false at service level', () => {
    const lowConf = JSON.stringify({
      ...JSON.parse(jsonString),
      confidence: 45,
      needsUserConfirmation: true,
    });
    const result = parseAiLabelResponse(lowConf);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(45);
    // usable check is in labelDocument — here we just confirm parse succeeds
    const isUsable = result!.confidence >= 70 && !result!.needsUserConfirmation;
    expect(isUsable).toBe(false);
  });

  it('high confidence result → usable', () => {
    const result = parseAiLabelResponse(jsonString);
    expect(result).not.toBeNull();
    expect(result!.confidence >= 70 && !result!.needsUserConfirmation).toBe(true);
  });
});
