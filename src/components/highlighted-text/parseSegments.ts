import { HIGHLIGHT_RULES } from './rules';
import type { HighlightRule, Segment } from './types';

export function parseSegments(text: string): Segment[] {
  if (!text) return [];
  const hits: { start: number; end: number; text: string; rule: HighlightRule }[] = [];
  for (const rule of HIGHLIGHT_RULES) {
    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(text)) !== null)
      hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], rule });
  }
  hits.sort((a, b) => a.start - b.start);
  const noOverlap: typeof hits = [];
  let cur = 0;
  for (const h of hits) {
    if (h.start >= cur) { noOverlap.push(h); cur = h.end; }
  }
  const segs: Segment[] = [];
  let pos = 0;
  for (const h of noOverlap) {
    if (h.start > pos) segs.push({ plain: true, text: text.slice(pos, h.start) });
    segs.push({ plain: false, text: h.text, rule: h.rule });
    pos = h.end;
  }
  if (pos < text.length) segs.push({ plain: true, text: text.slice(pos) });
  return segs;
}
