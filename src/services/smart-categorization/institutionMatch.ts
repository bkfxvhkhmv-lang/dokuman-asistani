import { INSTITUTION_DB } from './constants';
import type { InstitutionMatch } from './types';

const SUSPICIOUS_URL_PATTERNS = [
  /phish/i, /fake/i, /spoof/i, /\.xyz$/i, /\.tk$/i,
  /[a-z]+-[a-z]+-[a-z]+\.(com|de|net)/i, // subdomain impersonation
];

function berechneConfidence(haystack: string, matchedName: string): number {
  const lower = haystack.toLowerCase();
  const nameLower = matchedName.toLowerCase();

  // Phishing / suspicious URL → confidence capped at 40
  if (SUSPICIOUS_URL_PATTERNS.some(p => p.test(haystack))) return 40;

  // Exact name match in absender field → highest confidence
  if (lower.includes(nameLower)) return 95;

  // Keyword match only (no full name) → medium confidence
  return 72;
}

export function matchInstitution(text: string, absender: string | null): InstitutionMatch | null {
  const haystack = `${text} ${absender || ''}`;
  for (const inst of INSTITUTION_DB) {
    if (inst.pattern.test(haystack)) {
      const confidence = berechneConfidence(haystack, inst.name);
      return {
        name:       inst.name,
        typ:        inst.typ,
        subtyp:     inst.subtyp,
        icon:       inst.icon,
        land:       inst.land,
        confidence,
      };
    }
  }
  return null;
}
