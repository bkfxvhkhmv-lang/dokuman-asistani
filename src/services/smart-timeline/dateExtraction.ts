import type { TimelineEventType } from './types';

interface ExtractedDate {
  iso: string;
  label: string;
  typ: TimelineEventType;
  kontext: string;
}

const DATE_PATTERNS: { pattern: RegExp; label: string; typ: TimelineEventType }[] = [
  { pattern: /zahlungsfrist[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,  label: 'Zahlungsfrist',    typ: 'zahlung_frist' },
  { pattern: /fällig(?:\s+am)?[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Fällig',         typ: 'zahlung_frist' },
  { pattern: /bis\s+(?:spätestens\s+)?(?:zum\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Bis',  typ: 'zahlung_frist' },
  { pattern: /vertragsende[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,   label: 'Vertragsende',     typ: 'vertrag_ende' },
  { pattern: /kündigung.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,         label: 'Kündigung',        typ: 'vertrag_ende' },
  { pattern: /laufzeit.*?bis[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Laufzeitende',     typ: 'vertrag_ende' },
  { pattern: /termin[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,         label: 'Termin',           typ: 'termin' },
  { pattern: /vorladung.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,         label: 'Vorladung',        typ: 'termin' },
  { pattern: /einspruchsfrist.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,   label: 'Einspruchsfrist',  typ: 'einspruch_frist' },
  { pattern: /widerspruchsfrist.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Widerspruchsfrist',typ: 'einspruch_frist' },
];

function parseDE(tag: number, monat: number, jahr: number): string | null {
  if (tag < 1 || tag > 31 || monat < 1 || monat > 12 || jahr < 2020 || jahr > 2040) return null;
  try {
    return new Date(jahr, monat - 1, tag, 12, 0, 0).toISOString();
  } catch {
    return null;
  }
}

export function extractDatesFromText(rohText: string, typ: string): ExtractedDate[] {
  if (!rohText || rohText.length < 20) return [];
  const found: ExtractedDate[] = [];
  const seen = new Set<string>();

  for (const { pattern, label, typ: evTyp } of DATE_PATTERNS) {
    const m = rohText.match(pattern);
    if (m) {
      const iso = parseDE(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
      if (iso && !seen.has(iso)) {
        seen.add(iso);
        found.push({ iso, label, typ: evTyp, kontext: m[0].slice(0, 40) });
      }
    }
  }

  if ((typ === 'Bußgeld' || typ === 'Steuerbescheid') && found.length === 0) {
    const refDate = new Date();
    const days = typ === 'Bußgeld' ? 14 : 30;
    refDate.setDate(refDate.getDate() + days);
    found.push({
      iso: refDate.toISOString(),
      label: `Einspruchsfrist (berechnet, ${days} Tage)`,
      typ: 'einspruch_frist',
      kontext: 'Automatisch berechnet',
    });
  }

  return found;
}
