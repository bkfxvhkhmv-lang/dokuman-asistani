/**
 * D-3.5b — Pure adapter: Dokument-like source → NK cost-position import candidate
 *
 * No store dispatch, no UI, no full CostPosition creation.
 */

import {
  COST_CATEGORIES,
  resolveIncludeInCalculation,
} from '@/features/vermieter/nebenkosten/domain/costCategories';
import type {
  NkCostPositionImportCandidate,
  NkDokumentImportSource,
} from './types';

const DEFAULT_DESCRIPTION = 'Kostenposition aus Dokument';
const MAX_DESCRIPTION_LENGTH = 120;

interface CategoryHeuristicRule {
  categoryKey: string;
  reasonDe: string;
  pattern: RegExp;
}

const CATEGORY_HEURISTICS: CategoryHeuristicRule[] = [
  {
    categoryKey: 'grundsteuer',
    reasonDe: 'Text enthält Hinweis auf Grundsteuer.',
    pattern: /grundsteuer/i,
  },
  {
    categoryKey: 'heizung',
    reasonDe: 'Text enthält Hinweis auf Heizkosten oder Wärme.',
    pattern: /heizung|heizkosten|wärme|waerme|fernwärme|fernwaerme/i,
  },
  {
    categoryKey: 'warmwasser',
    reasonDe: 'Text enthält Hinweis auf Warmwasser.',
    pattern: /warmwasser/i,
  },
  {
    categoryKey: 'entwaesserung',
    reasonDe: 'Text enthält Hinweis auf Abwasser oder Entwässerung.',
    pattern: /abwasser|entwässerung|entwaesserung/i,
  },
  {
    categoryKey: 'wasserversorgung',
    reasonDe: 'Text enthält Hinweis auf Wasser oder Wasserversorgung.',
    pattern: /wasserversorgung|\bwasser\b/i,
  },
  {
    categoryKey: 'muellbeseitigung',
    reasonDe: 'Text enthält Hinweis auf Müll oder Abfall.',
    pattern: /müll|muell|abfall|müllbeseitigung|muellbeseitigung/i,
  },
  {
    categoryKey: 'hauswart',
    reasonDe: 'Text enthält Hinweis auf Hausmeister oder Hauswart.',
    pattern: /hausmeister|hauswart/i,
  },
  {
    categoryKey: 'gebaeudereinigung',
    reasonDe: 'Text enthält Hinweis auf Reinigung oder Gebäudereinigung.',
    pattern: /gebäudereinigung|gebaeudereinigung|\breinigung\b/i,
  },
  {
    categoryKey: 'gartenpflege',
    reasonDe: 'Text enthält Hinweis auf Gartenpflege.',
    pattern: /gartenpflege|\bgarten\b/i,
  },
  {
    categoryKey: 'versicherung',
    reasonDe: 'Text enthält Hinweis auf Versicherung.',
    pattern: /gebäudeversicherung|gebaeudeversicherung|versicherung/i,
  },
  {
    categoryKey: 'aufzug',
    reasonDe: 'Text enthält Hinweis auf Aufzug.',
    pattern: /aufzug/i,
  },
  {
    categoryKey: 'schornstein',
    reasonDe: 'Text enthält Hinweis auf Schornsteinreinigung.',
    pattern: /schornstein/i,
  },
];

function normalizeCurrency(waehrung: string | null | undefined): string {
  const raw = (waehrung ?? '').trim();
  if (!raw || raw === '€') return 'EUR';
  if (raw.toUpperCase() === 'EUR' || raw === '€') return 'EUR';
  return raw.toUpperCase();
}

function toTotalCents(betrag: number | null): number | null {
  if (typeof betrag !== 'number' || !Number.isFinite(betrag)) {
    return null;
  }
  return Math.round(betrag * 100);
}

function truncateDescription(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_DESCRIPTION_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

function firstZusammenfassungLine(zusammenfassung: string | null | undefined): string | null {
  if (!zusammenfassung) return null;
  const line = zusammenfassung.split('\n').map((part) => part.trim()).find(Boolean);
  return line ?? null;
}

function buildDescriptionDe(dok: NkDokumentImportSource): string {
  const absender = dok.absender?.trim();
  const typLabel = (dok.subtyp ?? dok.typ ?? '').trim();

  if (absender && typLabel) {
    return truncateDescription(`${absender} — ${typLabel}`);
  }
  if (absender) {
    return truncateDescription(absender);
  }

  const summaryLine = firstZusammenfassungLine(dok.zusammenfassung);
  if (summaryLine) {
    return truncateDescription(summaryLine);
  }

  return DEFAULT_DESCRIPTION;
}

function buildSearchText(dok: NkDokumentImportSource): string {
  return [
    dok.typ,
    dok.subtyp,
    dok.absender,
    dok.zusammenfassung,
    dok.rohText,
  ]
    .filter(Boolean)
    .join(' ');
}

function suggestCategory(searchText: string): Pick<
  NkCostPositionImportCandidate,
  'suggestedCategoryKey' | 'suggestedCategoryReasonDe'
> {
  for (const rule of CATEGORY_HEURISTICS) {
    if (rule.pattern.test(searchText) && COST_CATEGORIES[rule.categoryKey]) {
      return {
        suggestedCategoryKey: rule.categoryKey,
        suggestedCategoryReasonDe: rule.reasonDe,
      };
    }
  }

  return {
    suggestedCategoryKey: null,
    suggestedCategoryReasonDe: null,
  };
}

function suggestIncludeInCalculation(categoryKey: string | null): boolean | null {
  if (!categoryKey) return null;
  const category = COST_CATEGORIES[categoryKey];
  if (!category) return null;
  return resolveIncludeInCalculation(category.status);
}

export function mapDokumentToCostPositionDraft(
  dok: NkDokumentImportSource,
): NkCostPositionImportCandidate {
  const totalCents = toTotalCents(dok.betrag);
  const { suggestedCategoryKey, suggestedCategoryReasonDe } = suggestCategory(buildSearchText(dok));

  return {
    sourceDokId: dok.id,
    descriptionDe: buildDescriptionDe(dok),
    totalCents,
    currency: normalizeCurrency(dok.waehrung),
    suggestedCategoryKey,
    suggestedCategoryReasonDe,
    suggestedIncludeInCalculation: suggestIncludeInCalculation(suggestedCategoryKey),
    needsUserInput: {
      categoryKey: true,
      scope: true,
      unitId: true,
      allocationKey: true,
      amount: totalCents === null,
    },
    sourceMeta: {
      absender: dok.absender ?? null,
      dokumentDatum: dok.dokumentDatum ?? null,
      typ: dok.typ ?? null,
      subtyp: dok.subtyp ?? null,
      confidence: dok.confidence ?? null,
    },
  };
}
