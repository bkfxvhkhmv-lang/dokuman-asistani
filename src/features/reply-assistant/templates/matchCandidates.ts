import type { ReplyRiskLevel, ReplyTemplate } from '@/features/reply-assistant/domain/types';
import { getAllReplyTemplates } from './selectors';

export interface MatchCandidateInput {
  category?: string;
  institutionType?: string;
  documentType?: string;
  actionType?: string;
  riskLevel?: ReplyRiskLevel;
}

export interface MatchCandidateResult {
  candidates: ReplyTemplate[];
  reason: 'exact' | 'category' | 'fallback' | 'none';
}

// IDs safe to surface by default for a given category (procedural/low-friction first).
// Conditional IDs require a matching signal in input — see CONDITIONAL_IDS.
const CATEGORY_DEFAULT_IDS: Record<string, string[]> = {
  bussgeld: [
    'bussgeld_akten_einsicht_009',
    'bussgeld_fristverlaengerung_010',
    'bussgeld_photo_anfordern_013',
    'bussgeld_general_einspruch_005',
    // bussgeld_parking_einspruch_003 is conditional — parking signal required
  ],
  jobcenter: [
    'jobcenter_unterlagen_nachreichung_004',
    'jobcenter_fristverlaengerung_005',
    'jobcenter_sachstandsanfrage_untaetigkeit_013',
    'jobcenter_antrag_wba_007',
    // jobcenter_antrag_vorschuss_006 is conditional — vorschuss/notlage signal required
  ],
  finanzamt: [
    'finanzamt_fristverlaengerung_003',
    'finanzamt_akteneinsicht_007',
    'finanzamt_einspruch_fristwahrung_002',
    // finanzamt_ratenzahlung_005 is conditional — ratenzahlung/stundung signal required
  ],
  miete: [
    'miete_mangel_anzeige_004',
    'miete_belegeinsicht_002',
    'nk_belegeinsicht_002',
    // miete_reparatur_fristsetzung_005 is conditional — fristsetzung/reparatur signal required
  ],
  schufa: ['schufa_selbstauskunft_001'],
  // inkasso: inkasso_zahlung_nachweis_003 is conditional — payment/proof signal required
  inkasso: [],
};

interface ConditionalRule {
  id: string;
  test: (input: MatchCandidateInput) => boolean;
}

const CONDITIONAL_RULES: ConditionalRule[] = [
  {
    id: 'bussgeld_parking_einspruch_003',
    test: ({ category, documentType, actionType }) =>
      category === 'bussgeld' &&
      (documentType === 'parking' ||
        actionType === 'einspruch' ||
        actionType === 'dispute'),
  },
  {
    id: 'jobcenter_antrag_vorschuss_006',
    test: ({ category, documentType, actionType }) =>
      category === 'jobcenter' &&
      (documentType === 'vorschuss' ||
        documentType === 'notlage' ||
        actionType === 'vorschuss' ||
        actionType === 'antrag'),
  },
  {
    id: 'finanzamt_ratenzahlung_005',
    test: ({ category, documentType, actionType }) =>
      category === 'finanzamt' &&
      (documentType === 'ratenzahlung' ||
        documentType === 'stundung' ||
        documentType === 'zahlung' ||
        actionType === 'ratenzahlung' ||
        actionType === 'zahlung'),
  },
  {
    id: 'miete_reparatur_fristsetzung_005',
    test: ({ category, documentType, actionType }) =>
      category === 'miete' &&
      (documentType === 'reparatur' ||
        documentType === 'fristsetzung' ||
        actionType === 'fristsetzung' ||
        actionType === 'demand'),
  },
  {
    id: 'inkasso_zahlung_nachweis_003',
    test: ({ category, documentType, actionType }) =>
      category === 'inkasso' &&
      (documentType === 'zahlung' ||
        documentType === 'zahlungsnachweis' ||
        actionType === 'submit' ||
        actionType === 'nachweis'),
  },
];

function resolveIds(input: MatchCandidateInput): string[] {
  const category = input.category ?? '';
  const defaults = CATEGORY_DEFAULT_IDS[category] ?? [];

  const conditional = CONDITIONAL_RULES.filter(r => r.test(input)).map(r => r.id);

  // Deduplicate while preserving deterministic order: defaults first, then conditional additions
  const seen = new Set<string>(defaults);
  const extra: string[] = [];
  for (const id of conditional) {
    if (!seen.has(id)) {
      seen.add(id);
      extra.push(id);
    }
  }
  return [...defaults, ...extra];
}

export function getReplyTemplateCandidates(input: MatchCandidateInput): MatchCandidateResult {
  const category = input.category ?? '';

  if (!category || !(category in CATEGORY_DEFAULT_IDS)) {
    return { candidates: [], reason: 'none' };
  }

  const registry = getAllReplyTemplates();
  const byId = new Map(registry.map(t => [t.id, t]));

  const ids = resolveIds(input);
  const candidates = ids.map(id => byId.get(id)).filter((t): t is ReplyTemplate => t !== undefined);

  if (candidates.length === 0) {
    return { candidates: [], reason: 'none' };
  }

  // Determine match reason: if actionType or documentType narrowed the list, call it 'exact'
  const hasNarrowingSignal =
    (input.actionType !== undefined && input.actionType !== '') ||
    (input.documentType !== undefined && input.documentType !== '');

  const reason = hasNarrowingSignal ? 'exact' : 'category';
  return { candidates, reason };
}
