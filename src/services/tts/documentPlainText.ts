import type { Dokument } from '@/store';

/**
 * OCR tam metni: `rohText` öncelikli; yoksa sayfa `ocrText` sıralı birleştirme.
 */
export function getDocumentSpeechPlainText(d: Dokument): string {
  const r = (d.rohText ?? '').trim();
  if (r) return r;
  const pages = d.pages ?? [];
  if (!pages.length) return '';
  const bits = pages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(p => (p.ocrText ?? '').trim())
    .filter(Boolean);
  return bits.join('\n\n');
}
