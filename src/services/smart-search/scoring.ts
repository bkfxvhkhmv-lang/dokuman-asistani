import type { SearchHighlight } from './types';

const FIELD_WEIGHTS: Record<string, number> = {
  titel:           10,
  absender:        8,
  typ:             7,
  zusammenfassung: 5,
  kurzfassung:     5,
  etiketten:       6,
  rohText:         2,
};

export function scoreField(
  fieldValue: string | null | undefined,
  tokens: string[],
  fieldName: string,
): { score: number; highlight: SearchHighlight | null } {
  if (!fieldValue || tokens.length === 0) return { score: 0, highlight: null };

  const lower = fieldValue.toLowerCase();
  const weight = FIELD_WEIGHTS[fieldName] || 3;
  let score = 0;
  let highlight: SearchHighlight | null = null;

  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx >= 0) {
      score += weight;
      if (!highlight) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(fieldValue.length, idx + token.length + 30);
        highlight = {
          field: fieldName,
          excerpt: (start > 0 ? '…' : '') + fieldValue.slice(start, end) + (end < fieldValue.length ? '…' : ''),
          matchStart: idx - start + (start > 0 ? 1 : 0),
          matchLength: token.length,
        };
      }
      if (lower === token) score += weight * 2;
      if (lower.startsWith(token)) score += weight;
    }
  }

  return { score, highlight };
}
