import { z } from 'zod';

// ── ExplainResult ─────────────────────────────────────────────────────────────

export const ExplainResultSchema = z.object({
  text:          z.string().optional(),
  zusammenfassung: z.string().optional(),
  titel:         z.string().optional(),
  typ:           z.string().optional(),
  risiko:        z.enum(['hoch', 'mittel', 'niedrig']).optional(),
  betrag:        z.number().nullable().optional(),
  frist:         z.string().nullable().optional(),
  iban:          z.string().nullable().optional(),
  aktionen:      z.array(z.string()).optional(),
  confidence:    z.number().nullable().optional(),
  kurzfassung:   z.string().nullable().optional(),
  warnung:       z.string().nullable().optional(),
}).passthrough();

export type ExplainResult = z.infer<typeof ExplainResultSchema>;

// ── SyncDocument ──────────────────────────────────────────────────────────────

export const SyncDocumentSchema = z.object({
  id:         z.string(),
  user_id:    z.string().optional(),
  status:     z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  checksum:   z.string().optional(),
  version:    z.number().optional(),
  updated_at: z.string().optional(),
}).passthrough();

// ── DeltaSyncResult ───────────────────────────────────────────────────────────

export const DeltaSyncResultSchema = z.object({
  changed: z.array(SyncDocumentSchema),
  deleted: z.array(z.string()),
}).passthrough();

export type DeltaSyncResult = z.infer<typeof DeltaSyncResultSchema>;
