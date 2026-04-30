import { VISION_URL } from './constants';
import type { EntityBox, VisionResult } from './types';

export async function extractTextFromImage(base64Image: string): Promise<VisionResult> {
  const body = {
    requests: [{
      image: { content: base64Image },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
      imageContext: { languageHints: ['de', 'tr', 'en'] },
    }],
  };

  const response = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vision API Fehler: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  if (!annotation) return { text: '', confidence: 0, entityBoxes: [] };

  interface WordEntry { text: string; bbox: { x: number; y: number; w: number; h: number } }
  const words: WordEntry[] = [];
  let total = 0, count = 0;

  for (const page of annotation.pages || []) {
    for (const block of page.blocks || []) {
      for (const para of block.paragraphs || []) {
        for (const word of para.words || []) {
          if (word.confidence != null) { total += word.confidence; count++; }

          const wordText = (word.symbols || []).map((s: { text?: string }) => s.text || '').join('');
          const verts = word.boundingBox?.vertices || [];
          if (verts.length === 4 && wordText) {
            const xs = verts.map((v: { x?: number }) => v.x || 0);
            const ys = verts.map((v: { y?: number }) => v.y || 0);
            const x = Math.min(...xs), y = Math.min(...ys);
            words.push({ text: wordText, bbox: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } });
          }
        }
      }
    }
  }

  const ENTITY_PATTERNS: Array<{ type: EntityBox['type']; regex: RegExp }> = [
    { type: 'betrag',      regex: /^\d{1,6}[.,]\d{2}€?$|^€?\d{1,6}[.,]\d{2}$/ },
    { type: 'frist',       regex: /^\d{1,2}\.\d{1,2}\.\d{2,4}$/ },
    { type: 'iban',        regex: /^DE\d{2}/ },
    { type: 'aktenzeichen',regex: /^Az\.?$/i },
    { type: 'datum',       regex: /^\d{1,2}\.\d{1,2}\.\d{4}$/ },
  ];

  const entityBoxes: EntityBox[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    for (const { type, regex } of ENTITY_PATTERNS) {
      if (regex.test(w.text.trim())) {
        const key = `${type}:${w.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          entityBoxes.push({ ...w.bbox, type, text: w.text });
        }
      }
    }
  }

  const confidence = count > 0 ? Math.round((total / count) * 100) : null;
  return { text: annotation.text || '', confidence, entityBoxes };
}
