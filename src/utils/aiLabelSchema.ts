import { z } from 'zod';

/**
 * Strict schema for the JSON object expected from the AI Labeler prompt.
 * Every field is validated before the result is used anywhere in the app.
 */
export const AiLabelResponseSchema = z.object({
  /** Short, user-facing document title in German. Max 120 chars. */
  displayTitle: z.string().min(1).max(120),
  /**
   * Canonical document type string.
   * Not exhaustive — AI may return values outside this list;
   * caller is responsible for mapping unknown values to "Sonstiges".
   */
  documentType: z.string().min(1).max(80),
  /** Institution or company name, or null if not determinable. */
  sender: z.string().max(80).nullable(),
  /** One sentence in German summarising the document. */
  shortSummary: z.string().max(300),
  /**
   * Confidence score 0–100.
   * >= 70 → result can be applied automatically.
   *  < 70 → requires user confirmation.
   */
  confidence: z.number().int().min(0).max(100),
  /** True when the AI is uncertain and the user should verify. */
  needsUserConfirmation: z.boolean(),
  /** Brief explanation (German) of what the AI detected. */
  reason: z.string().max(200),
});

export type AiLabelResponse = z.infer<typeof AiLabelResponseSchema>;

/** Parses and validates an AI response string that should contain a JSON object. */
export function parseAiLabelResponse(raw: string): AiLabelResponse | null {
  const jsonMatch = raw.match(/\{[\s\S]+\}/);
  if (!jsonMatch) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
  const result = AiLabelResponseSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
