const VISION_API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY;
const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

export interface EntityBox {
  x:    number;
  y:    number;
  w:    number;
  h:    number;
  type: 'betrag' | 'frist' | 'iban' | 'aktenzeichen' | 'datum';
  text: string;
}

export interface VisionResult {
  text:        string;
  confidence:  number | null;
  entityBoxes: EntityBox[];   // #53 bounding boxes for detected entities
}

export interface DocumentAnalysis {
  typ: string;
  risiko: 'hoch' | 'mittel' | 'niedrig';
  betrag: number | null;
  frist: string | null;
  absender: string;
  aktionen: string[];
  zusammenfassung: string;
  kurzfassung: string;
  iban: string | null;
}

export function extrahiereIBAN(text: string): string | null {
  const matches = text.match(/[A-Z]{2}\d{2}[\s]?([A-Z0-9]{4}[\s]?){4,7}/g);
  if (!matches) return null;
  for (const raw of matches) {
    const iban = raw.replace(/\s/g, '');
    if (validiereIBAN(iban)) return iban;
  }
  return null;
}

export function validiereIBAN(iban: string): boolean {
  if (!iban || iban.length < 15 || iban.length > 34) return false;
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  const zahlen = umgestellt.split('').map(c => {
    const code = c.charCodeAt(0);
    return code >= 65 ? String(code - 55) : c;
  }).join('');
  let rest = 0;
  for (const ziffer of zahlen) {
    rest = (rest * 10 + parseInt(ziffer)) % 97;
  }
  return rest === 1;
}

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

  // ── Collect all words with their bboxes (#53) ──────────────────────────────
  interface WordEntry { text: string; bbox: { x: number; y: number; w: number; h: number } }
  const words: WordEntry[] = [];
  let total = 0, count = 0;

  for (const page of annotation.pages || []) {
    for (const block of page.blocks || []) {
      for (const para of block.paragraphs || []) {
        for (const word of para.words || []) {
          if (word.confidence != null) { total += word.confidence; count++; }

          // Reconstruct word text from symbols
          const wordText = (word.symbols || []).map((s: any) => s.text || '').join('');
          const verts = word.boundingBox?.vertices || [];
          if (verts.length === 4 && wordText) {
            const xs = verts.map((v: any) => v.x || 0);
            const ys = verts.map((v: any) => v.y || 0);
            const x = Math.min(...xs), y = Math.min(...ys);
            words.push({ text: wordText, bbox: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } });
          }
        }
      }
    }
  }

  // ── Match entity patterns to word bboxes (#53) ────────────────────────────
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

export function analysiereText(text: string): DocumentAnalysis {
  if (!text || text.trim().length < 5) {
    throw new Error('Kein Text erkannt. Bitte ein deutlicheres Foto aufnehmen.');
  }

  const lower = text.toLowerCase();

  let typ: string = 'Sonstiges';
  let risiko: 'hoch' | 'mittel' | 'niedrig' = 'niedrig';
  let aktionen: string[] = [];

  if (lower.includes('rechnung') || lower.includes('rechnungsdatum') || lower.includes('rechnungsnr') ||
      lower.includes('invoice') || lower.includes('mwst') || lower.includes('gesamtbetrag') ||
      lower.includes('einzelpreis') || lower.includes('endbetrag') || lower.includes('zwischensumme')) {
    typ = 'Rechnung'; risiko = 'mittel'; aktionen = ['zahlen', 'kalender'];
  } else if (lower.includes('mahnung') || lower.includes('zahlungserinnerung') || lower.includes('rückstand') || lower.includes('säumnis')) {
    typ = 'Mahnung'; risiko = 'hoch'; aktionen = ['zahlen', 'kalender'];
  } else if (lower.includes('bußgeld') || lower.includes('bussgeldbescheid') || lower.includes('ordnungswidrigkeit') || lower.includes('verwarnungsgeld')) {
    typ = 'Bußgeld'; risiko = 'hoch'; aktionen = ['zahlen', 'einspruch', 'kalender'];
  } else if (lower.includes('steuerbescheid') || lower.includes('finanzamt') || lower.includes('einkommensteuer')) {
    typ = 'Steuerbescheid'; risiko = 'hoch'; aktionen = ['zahlen', 'einspruch', 'kalender'];
  } else if (lower.includes('kündigung')) {
    typ = 'Kündigung'; risiko = 'hoch'; aktionen = ['einspruch', 'kalender'];
  } else if (lower.includes('termin') || lower.includes('vorladung')) {
    typ = 'Termin'; risiko = 'mittel'; aktionen = ['kalender'];
  } else if (lower.includes('versicherung') || lower.includes('police')) {
    typ = 'Versicherung'; risiko = 'niedrig'; aktionen = [];
  } else if (lower.includes('vertrag')) {
    typ = 'Vertrag'; risiko = 'niedrig'; aktionen = [];
  } else if (lower.includes('bescheid') || lower.includes('behörde')) {
    typ = 'Behördenbescheid'; risiko = 'mittel'; aktionen = ['kalender'];
  }

  // ── Betrag ────────────────────────────────────────────────────────────────
  let betrag: number | null = null;
  const betragPatterns = [
    /gesamtbetrag\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /endbetrag\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /betrag\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /zu\s+zahlen\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /summe\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /zwischensumme\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /(\d{1,6}(?:[.,]\d{1,2})?)\s*€/,
    /€\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
    /gesamt\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*€/i,
  ];

  for (const p of betragPatterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(',', '.'));
      if (val > 0 && val < 999999) { betrag = val; break; }
    }
  }

  if (!betrag) {
    const m = text.match(/(?:gesamtbetrag|endbetrag|betrag)\s*[€£$]?\s*(\d{1,5})/i);
    if (m) betrag = parseFloat(m[1]);
  }

  // ── Datum / Frist ─────────────────────────────────────────────────────────
  let frist: string | null = null;
  let rechnungsDatum: string | null = null;

  const datumPatterns = [
    /rechnungsdatum[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /rechnungsdatum[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{2,4})/i,
    /bis\s+(?:zum\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /fällig\s+(?:am\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /zahlungsfrist[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /lieferdatum[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /(\d{1,2})[.\-](\d{1,2})[.\-](20\d{2})/,
  ];

  for (const p of datumPatterns) {
    const m = text.match(p);
    if (m) {
      try {
        let tag   = parseInt(m[1]);
        let monat = parseInt(m[2]) - 1;
        let jahr  = parseInt(m[3]);
        if (jahr < 100) jahr = 2000 + jahr;
        if (tag >= 1 && tag <= 31 && monat >= 0 && monat <= 11 && jahr >= 2020) {
          if (p.toString().includes('rechnungsdatum')) {
            rechnungsDatum = new Date(jahr, monat, tag).toISOString();
          } else if (!frist) {
            frist = new Date(jahr, monat, tag).toISOString();
          }
          break;
        }
      } catch {}
    }
  }

  if (!frist && rechnungsDatum) {
    const date = new Date(rechnungsDatum);
    date.setDate(date.getDate() + 14);
    frist = date.toISOString();
  }

  // ── Absender ──────────────────────────────────────────────────────────────
  let absender = 'Unbekannter Absender';
  const absenderPatterns = [
    /inhaber[:\s]+([^\n]{5,60})/i,
    /([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s&\-\.]{3,40}(?:GmbH|AG|KG|UG|e\.V\.|Ltd|mbH|Jochum))/m,
    /^([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s&]{4,40})$/m,
  ];

  for (const p of absenderPatterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 3) {
      absender = m[1].trim().replace(/\n/g, ' ').slice(0, 60);
      break;
    }
  }

  if (absender === 'Unbekannter Absender') {
    const satirlar = text.split('\n').map(l => l.trim()).filter(l => l.length > 4 && /[a-zA-ZäöüÄÖÜß]/.test(l));
    if (satirlar.length > 0) absender = satirlar[0].slice(0, 60);
  }

  const iban            = extrahiereIBAN(text);
  const zusammenfassung = erstelleZusammenfassung(text, typ, betrag, frist, absender);
  const kurzfassung     = erstelleKurzfassung(typ, betrag, frist, absender);

  return { typ, risiko, betrag, frist, absender, aktionen, zusammenfassung, kurzfassung, iban };
}

function erstelleZusammenfassung(
  text: string,
  typ: string,
  betrag: number | null,
  frist: string | null,
  absender: string,
): string {
  let s = ` Dokumenttyp: ${typ}\n\n`;
  s += `👤 Absender: ${absender}\n\n`;

  if (betrag) {
    s += `💰 Betrag: ${betrag.toFixed(2).replace('.', ',')} €\n\n`;
  } else {
    s += ` Betrag: Nicht erkannt – bitte prüfen Sie das Dokument manuell\n\n`;
  }

  if (frist) {
    const d = new Date(frist);
    s += ` Frist: ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
  } else {
    s += ` Frist: Keine Frist erkannt\n\n`;
  }

  const rechnungsNrMatch = text.match(/(?:rechnungsnr|rechnungsnummer)[:\s]+(\d+)/i);
  if (rechnungsNrMatch) s += `🔢 Rechnungsnummer: ${rechnungsNrMatch[1]}\n\n`;

  s += `📌 Empfehlung: `;

  if (typ === 'Rechnung') {
    if (betrag) {
      s += `Bitte überweisen Sie ${betrag.toFixed(2).replace('.', ',')} € rechtzeitig.`;
      if (frist) {
        const d = new Date(frist);
        s += ` Die Zahlung ist bis zum ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} fällig.`;
      }
      s += ` Verwenden Sie dabei bitte die angegebene Rechnungsnummer als Verwendungszweck.`;
    } else {
      s += 'Bitte prüfen Sie den Betrag auf der Rechnung und zahlen Sie rechtzeitig.';
    }
  } else if (typ === 'Mahnung') {
    s += ' Dies ist eine Mahnung! Bitte begleichen Sie den offenen Betrag umgehend, um weitere Mahngebühren und rechtliche Schritte zu vermeiden.';
  } else if (typ === 'Bußgeld') {
    s += ' Sie haben zwei Optionen: 1) Zahlen Sie den Betrag innerhalb der Frist, 2) Legen Sie schriftlich Einspruch ein.';
  } else if (typ === 'Steuerbescheid') {
    s += ' Prüfen Sie den Bescheid sorgfältig auf Fehler. Bei Unstimmigkeiten haben Sie einen Monat Zeit für Einspruch.';
  } else if (typ === 'Kündigung') {
    s += ' Prüfen Sie die Kündigungsfristen und die Rechtswirksamkeit.';
  } else {
    s += 'Bitte dokumentieren Sie dieses Schreiben und beachten Sie eventuelle Fristen.';
  }

  return s;
}

function erstelleKurzfassung(
  typ: string,
  betrag: number | null,
  frist: string | null,
  absender: string,
): string {
  const betragStr = betrag ? `${betrag.toFixed(2).replace('.', ',')} €` : null;
  const fristStr  = frist
    ? new Date(frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    : null;

  if (typ === 'Rechnung') {
    if (betragStr && fristStr) return `${betragStr} bis ${fristStr} an ${absender} zahlen.`;
    if (betragStr)             return `Rechnung über ${betragStr} von ${absender}.`;
    return `Rechnung von ${absender}.`;
  }
  if (typ === 'Mahnung') {
    if (betragStr && fristStr) return `Mahnung: ${betragStr} sofort bis ${fristStr} begleichen.`;
    if (betragStr)             return `Mahnung über ${betragStr} von ${absender}.`;
    return `Mahnung von ${absender} – sofortige Zahlung erforderlich.`;
  }
  if (typ === 'Bußgeld') {
    if (betragStr && fristStr) return `Bußgeld ${betragStr} – zahlen oder Einspruch bis ${fristStr}.`;
    if (betragStr)             return `Bußgeldbescheid über ${betragStr} von ${absender}.`;
    return `Bußgeldbescheid von ${absender}.`;
  }
  if (typ === 'Steuerbescheid') {
    if (betragStr && fristStr) return `Steuernachzahlung ${betragStr} bis ${fristStr}.`;
    return `Steuerbescheid von ${absender}.`;
  }
  if (typ === 'Termin') {
    if (fristStr) return `Termin am ${fristStr} bei ${absender}.`;
    return `Terminbestätigung von ${absender}.`;
  }
  if (typ === 'Kündigung') {
    if (fristStr) return `Kündigung von ${absender} – Frist ${fristStr}.`;
    return `Kündigungsschreiben von ${absender}.`;
  }
  if (typ === 'Versicherung') return `Versicherungsdokument von ${absender}.`;
  if (typ === 'Vertrag')      return `Vertrag mit ${absender}.`;
  if (fristStr)               return `Schreiben von ${absender} – Frist ${fristStr}.`;
  return `Schreiben von ${absender}.`;
}
