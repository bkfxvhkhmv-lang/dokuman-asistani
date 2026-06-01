/**
 * AI Labeler Service — Document display name fallback via LLM.
 *
 * Architecture:
 *   Rules first (deterministic) → AI fallback only for weak/generic results.
 *
 * Hard rules:
 *   - Only called when shouldLabel() returns true.
 *   - Never overwrites a strong, specific deterministic result.
 *   - Result is cached via aiLabelledAt — one call per document lifetime.
 *   - Confidence < 70 → usable = false (requires user confirmation).
 *   - No automatic UI mutation in this module — callers decide how to apply.
 *   - No call during list rendering.
 */

import type { Dokument } from '@/store/types';
import { isWeakSender } from '@/utils/senderNormalization';
import { parseAiLabelResponse, type AiLabelResponse } from '@/utils/aiLabelSchema';
import { chatWithDocument } from '@/services/v4Api';

// ── Trigger guard ─────────────────────────────────────────────────────────────

const WEAK_TYPES = new Set([
  'formular', 'sonstiges', 'unbekannt', 'unknown', 'dokument', '',
]);

const GENERIC_TITLE_RE =
  /^(dokument|formular|unbekanntes dokument|scan[\s_]\d*|neues dokument|sonstiges|analysiertes dokument|bild ausgewählt|foto aufgenommen)$/i;

type LabelCandidate = Pick<Dokument,
  | 'typ' | 'absender' | 'titel' | 'rohText' | 'v4DocId'
  | 'aiLabelledAt' | 'confidence'
>;

/**
 * Returns true when the document has weak/generic classification and
 * the AI Labeler should be triggered.
 *
 * Guard conditions that prevent calling:
 *  - aiLabelledAt is set (already labelled — cache hit)
 *  - v4DocId is null (no backend document to reference)
 *  - rohText is empty (no OCR text to send)
 */
export function shouldLabel(dok: Partial<LabelCandidate>): boolean {
  if (dok.aiLabelledAt) return false;
  if (!dok.v4DocId?.trim()) return false;
  if (!dok.rohText?.trim()) return false;

  const typeIsWeak = WEAK_TYPES.has((dok.typ ?? '').trim().toLowerCase());
  const senderIsWeak = isWeakSender(dok.absender);
  const titleIsGeneric = !dok.titel || GENERIC_TITLE_RE.test(dok.titel.trim());

  return typeIsWeak || senderIsWeak || titleIsGeneric;
}

// ── OCR excerpt builder ───────────────────────────────────────────────────────

const MAX_LINES = 80;
const MAX_CHARS = 2500;

/**
 * Extracts a short, clean excerpt from the raw OCR text.
 * Skips blank lines, caps at MAX_LINES / MAX_CHARS to limit token cost.
 */
export function buildLabelExcerpt(rohText: string): string {
  const lines = rohText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1) // drop single-char noise
    .slice(0, MAX_LINES);
  return lines.join('\n').slice(0, MAX_CHARS);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

/**
 * Builds the structured labelling prompt sent to the AI.
 * Output must be a single JSON object — no markdown, no prose.
 */
export function buildLabelPrompt(
  excerpt: string,
  currentTitle: string,
  currentType: string,
  currentSender: string,
): string {
  return `Du bist ein Klassifikator für deutsche Dokumente. Analysiere diesen OCR-Text und antworte NUR mit einem JSON-Objekt.

Aktuelle Klassifikation (möglicherweise unvollständig):
- Titel: ${currentTitle}
- Typ: ${currentType}
- Absender: ${currentSender}

OCR-Textauszug:
---
${excerpt}
---

Antworte NUR mit diesem JSON (kein Markdown, keine Erklärung):
{
  "displayTitle": "<kurzer deutscher Titel, max 80 Zeichen>",
  "documentType": "<Rechnung | Mahnung | Steuerbescheid | Versicherung | Behördenbescheid | Kündigung | Vertrag | Überweisung | MRT-Überweisung | Nebenkostenabrechnung | Bußgeld | Formular | Sonstiges>",
  "sender": "<Institution oder Firmenname, oder null>",
  "shortSummary": "<ein Satz auf Deutsch, max 150 Zeichen>",
  "confidence": <0-100>,
  "needsUserConfirmation": <true wenn unsicher>,
  "reason": "<kurze Begründung auf Deutsch>"
}

Regeln:
- Enthält der Text "Überweisungsschein" oder "Überweisung" → Typ "Überweisung" oder "MRT-Überweisung" (wenn MRT vorhanden)
- Enthält der Text "Nebenkostenabrechnung" → entsprechenden Typ verwenden
- Sender darf keine Privatperson sein — nur Firmen/Behörden
- confidence < 70 → needsUserConfirmation muss true sein
- Keine Fakten erfinden, die nicht im Text stehen`;
}

// ── Main labeller ─────────────────────────────────────────────────────────────

export interface AiLabelerResult {
  response: AiLabelResponse;
  /** True when confidence >= 70 and needsUserConfirmation is false. */
  usable: boolean;
}

/**
 * Calls the backend AI chat endpoint with a structured labelling prompt
 * and returns a validated result, or null on any failure.
 *
 * The caller is responsible for:
 *  - Checking shouldLabel(dok) before calling
 *  - Storing aiLabelledAt after a call to prevent re-calls
 *  - Deciding whether to auto-apply (usable) or show a suggestion (not usable)
 */
export async function labelDocument(dok: {
  v4DocId: string;
  rohText: string;
  titel: string;
  typ: string;
  absender: string;
}): Promise<AiLabelerResult | null> {
  const excerpt = buildLabelExcerpt(dok.rohText);
  if (!excerpt) return null;

  const prompt = buildLabelPrompt(
    excerpt,
    dok.titel || 'Unbekanntes Dokument',
    dok.typ   || 'Unbekannt',
    dok.absender || 'Unbekannt',
  );

  let raw: unknown;
  try {
    raw = await chatWithDocument(dok.v4DocId, [{ role: 'user', content: prompt }]);
  } catch {
    return null;
  }

  const replyText = (raw as { reply?: string })?.reply ?? '';
  const response = parseAiLabelResponse(replyText);
  if (!response) return null;

  return {
    response,
    usable: response.confidence >= 70 && !response.needsUserConfirmation,
  };
}
