/**
 * Maps document fields (typ, absender, titel) to a reply-assistant category.
 * Returns undefined when no template category matches.
 * Categories must align with CATEGORY_DEFAULT_IDS in matchCandidates.ts.
 */
export function inferReplyCategory(
  typ?: string | null,
  absender?: string | null,
  titel?: string | null,
): string | undefined {
  const norm = (s?: string | null) =>
    (s ?? '').toLowerCase()
      .replace(/ß/g, 'ss')
      .replace(/[üÜ]/g, 'u')
      .replace(/[äÄ]/g, 'a')
      .replace(/[öÖ]/g, 'o');
  const all = `${norm(typ)} ${norm(absender)} ${norm(titel)}`.trim();
  if (!all) return undefined;
  if (/bussgeld|ordnungswidrig|ordnungsamt/.test(all))      return 'bussgeld';
  if (/jobcenter|burgergeld/.test(all))                     return 'jobcenter';
  if (/finanzamt|steuer/.test(all))                         return 'finanzamt';
  if (/miete|nebenkosten|vermieter|mietvertrag/.test(all))  return 'miete';
  if (/schufa/.test(all))                                   return 'schufa';
  if (/inkasso|mahnung|pfandung/.test(all))                 return 'inkasso';
  return undefined;
}
