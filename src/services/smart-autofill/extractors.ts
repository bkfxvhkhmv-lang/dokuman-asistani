// Multiline & whitespace-tolerant helper — OCR text often has extra spaces/newlines
// between labels and values.
function matchFirst(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}

export function extractAktenzeichen(text: string): { wert: string | null; score: number } {
  const patterns = [
    /[Aa]ktenzeichen[\s:]+([A-Z0-9/_-]{4,30})/m,
    /[Kk]ennzeichen[\s:]+([A-Z0-9/_-]{4,30})/m,
    /(?:Az\.|AZ)[\s:]+([A-Z0-9/_-]{4,30})/m,
    /[Bb]escheids?nr\.?[\s:]+([A-Z0-9/_-]{4,30})/im,
  ];
  const m = matchFirst(text, patterns);
  if (m) return { wert: m[1].trim(), score: 85 };
  return { wert: null, score: 0 };
}

export function extractKundennr(text: string): { wert: string | null; score: number } {
  const patterns = [
    /[Kk]undennr\.?[\s:]+([A-Z0-9-]{4,25})/m,
    /[Kk]undennummer[\s:]+([A-Z0-9-]{4,25})/m,
    /[Kk]unden-?[Nn]r\.?[\s:]+([A-Z0-9-]{4,25})/m,
  ];
  const m = matchFirst(text, patterns);
  if (m) return { wert: m[1].trim(), score: 80 };
  return { wert: null, score: 0 };
}

export function extractRechnungsnr(text: string): { wert: string | null; score: number } {
  const patterns = [
    /[Rr]echnungs(?:nummer|nr)\.?[\s:]+([A-Z0-9-/]{3,25})/m,
    /[Rr]e\.-?[Nn]r\.?[:\s]+([A-Z0-9\-\/]{3,20})/,
    /[Ii]nvoice\s*[Nn]o\.?[:\s]+([A-Z0-9\-\/]{3,20})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { wert: m[1].trim(), score: 85 };
  }
  return { wert: null, score: 0 };
}

export function extractVertragsnr(text: string): { wert: string | null; score: number } {
  const m = text.match(/[Vv]ertragsnr\.?[:\s]+([A-Z0-9\-]{4,20})/);
  if (m) return { wert: m[1].trim(), score: 80 };
  return { wert: null, score: 0 };
}

export function extractZahlungszweck(text: string, typ: string, rechnungsnr: string | null): { wert: string | null; score: number } {
  const patterns = [
    /[Vv]erwendungszweck[:\s]+([^\n]{5,60})/,
    /[Bb]etreff[:\s]+([^\n]{5,60})/,
    /[Bb]ezug[:\s]+([^\n]{5,60})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { wert: m[1].trim(), score: 80 };
  }
  if (rechnungsnr && (typ === 'Rechnung' || typ === 'Mahnung')) {
    return { wert: `Rechnungsnr. ${rechnungsnr}`, score: 55 };
  }
  return { wert: null, score: 0 };
}

export function extractSteuerid(text: string): { wert: string | null; score: number } {
  const m = text.match(/(?:Steuer-ID|Steuernummer|USt-IdNr)[.:\s]+([0-9/\s]{8,20})/i);
  if (m) return { wert: m[1].replace(/\s/g, '').trim(), score: 85 };
  return { wert: null, score: 0 };
}

export function extractTitelFromText(text: string, typ: string, absender: string | null): { wert: string; score: number } {
  const betreffMatch = text.match(/[Bb]etreff[:\s]+([^\n]{10,80})/);
  if (betreffMatch) return { wert: betreffMatch[1].trim(), score: 90 };

  const betreffs = [
    /[Ii]hr(?:e|er)?\s+(?:Rechnung|Mahnung|Bescheid)[:\s]+([^\n]{5,60})/i,
    /[Rr]echnung\s+(?:vom\s+)?[Nn]r\.?\s*([A-Z0-9\-\/]{3,20})/i,
  ];
  for (const p of betreffs) {
    const m = text.match(p);
    if (m) return { wert: m[0].trim().slice(0, 60), score: 75 };
  }

  if (absender && absender !== 'Unbekannter Absender') {
    return { wert: `${typ} von ${absender}`, score: 50 };
  }
  return { wert: typ, score: 30 };
}
