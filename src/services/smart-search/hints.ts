import type { SearchResult } from './types';

export function buildCorrectionHint(query: string, results: SearchResult[]): string | null {
  if (results.length > 0) return null;

  const suggestions: [RegExp, string][] = [
    [/^[a-z]{1,4}$/i, 'Tipp: Versuchen Sie einen vollständigen Begriff'],
    [/fin.?amt|steuer/i, '"Steuerbescheid" oder "Finanzamt" suchen?'],
    [/voda|telekom|o2/i, 'Nach Telefonanbieter-Rechnungen suchen?'],
  ];
  for (const [re, hint] of suggestions) {
    if (re.test(query)) return hint;
  }
  return null;
}
