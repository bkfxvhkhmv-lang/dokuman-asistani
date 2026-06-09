/** Sorgu düzeltme, eşanlamlılar ve fuzzy eşleşme. */

const SYNONYME: Record<string, string[]> = {
  'rechnung':       ['invoice', 'faktura', 'rechng',
    'fatura', 'ödeme', 'fiyat'],
  'mahnung':        ['zahlungserinnerung', 'inkasso',
    'hatırlatma', 'ödeme hatırlatma'],
  'bußgeld':        ['bussgeld', 'strafzettel', 'ordnungswidrigk', 'verwarnungsgeld',
    'ceza', 'para cezası', 'trafik cezası'],
  'steuerbescheid': ['steuern', 'finanzamt', 'steuer',
    'vergi', 'vergi bildirimi', 'gelir vergisi'],
  'versicherung':   ['police', 'versich',
    'sigorta', 'sigorta poliçe'],
  'vertrag':        ['vereinbarung', 'contract',
    'sözleşme', 'kontrat', 'anlaşma'],
  'kündigung':      ['kuendigung', 'kündigt',
    'iptal', 'fesih'],
  'miete':          ['mietzahlung', 'nebenkosten',
    'kira', 'kira ödemesi'],
  'arzt':           ['krankenhaus', 'gesundheit',
    'doktor', 'hastane', 'sağlık'],
  'auto':           ['kfz', 'fahrzeug',
    'araç', 'otomobil', 'araba'],
  'bank':           ['konto', 'sparkasse',
    'banka', 'hesap'],
  'überfällig':     ['fällig', 'ausstehend',
    'gecikmiş', 'vadesi geçmiş'],
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

export function fuzzyMatch(token: string, query: string): boolean {
  if (token.startsWith(query)) return true;
  if (query.length >= 4 && token.length >= 4) return levenshtein(token, query) <= 1;
  return false;
}

export function normalizeQuery(query: string): string {
  let q = query.toLowerCase().trim();
  for (const [canonical, synonyme] of Object.entries(SYNONYME)) {
    for (const syn of synonyme) {
      if (q.includes(syn)) {
        q = q.replace(new RegExp(syn, 'g'), canonical);
      }
    }
  }
  return q;
}

export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\säöüÄÖÜß]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}
