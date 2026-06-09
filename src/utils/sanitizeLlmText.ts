/** KI açıklamasındaki gereksiz dil meta-satırlarını uzaklaştırır (API gürültüsü). */
export function stripLlmLanguageMetaLines(text: string): string {
  if (!text.trim()) return text;

  const drop = (line: string): boolean => {
    const t = line.trim();
    if (!t.length) return false;
    if (t.length > 200) return false;
    const lower = t.toLowerCase();
    if (/^(#{1,6}\s*|[-*]\s*|•\s*)/i.test(t) && lower.length < 120) {
      /** meta headings */
      if (/türk(ç|i)che?|turkish|deutsch(german)?|output|çıktı|translation|übernommen|über setzt/i.test(lower)) return true;
    }
    if (
      /\b(von der ki|wie folgt übersetzt|als türkisch|türkisch erhalten|türk\s*çe olarak| olarak alın| wurde erhalten)/i.test(
        t,
      )
    ) {
      return true;
    }
    if (/^(\*\*|__)?türk|^türk\s*çe\s*[:=]/i.test(t)) return true;
    return false;
  };

  const out = text
    .split('\n')
    .filter(line => !drop(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out.length > 40 ? out : text;
}
