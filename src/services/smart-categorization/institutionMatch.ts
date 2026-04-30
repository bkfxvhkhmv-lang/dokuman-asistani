import { INSTITUTION_DB } from './constants';
import type { InstitutionMatch } from './types';

export function matchInstitution(text: string, absender: string | null): InstitutionMatch | null {
  const haystack = `${text} ${absender || ''}`;
  for (const inst of INSTITUTION_DB) {
    if (inst.pattern.test(haystack)) {
      return {
        name:       inst.name,
        typ:        inst.typ,
        subtyp:     inst.subtyp,
        icon:       inst.icon,
        land:       inst.land,
        confidence: 90,
      };
    }
  }
  return null;
}
