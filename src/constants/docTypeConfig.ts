import type React from 'react';
import {
  Money, WarningCircle, FileText, Buildings, ShieldCheck,
  Heart, BookOpen, ChartBar, Receipt, File,
} from 'phosphor-react-native';
import {
  normalizeDocumentTyp,
  normalizeAndRefineTyp,
  type CanonicalDocumentType,
} from '@/product/canonicalDocTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DocTypeConfig {
  emoji: string;
  PhIcon: React.ComponentType<any>;
  /** Primary accent color (hex, light theme) */
  color: string;
  /** Soft tinted background (hex, light theme) */
  bg: string;
  /** Short display label for chips / badges */
  shortLabel: string;
}

const CONFIG: Record<CanonicalDocumentType, DocTypeConfig> = {
  'Rechnungen': {
    emoji: '💶',
    PhIcon: Money,
    color: '#4361EE',
    bg: '#EEF1FD',
    shortLabel: 'Rechnung',
  },
  'Mahnung / Zahlungserinnerung': {
    emoji: '⚠️',
    PhIcon: WarningCircle,
    color: '#EE6055',
    bg: '#FEF0EF',
    shortLabel: 'Mahnung',
  },
  'Verträge': {
    emoji: '📋',
    PhIcon: FileText,
    color: '#7C3AED',
    bg: '#F0EAFF',
    shortLabel: 'Vertrag',
  },
  'Behörden / Amt': {
    emoji: '🏛️',
    PhIcon: Buildings,
    color: '#1D9E75',
    bg: '#E8F5EF',
    shortLabel: 'Behörde',
  },
  'Versicherung': {
    emoji: '🛡️',
    PhIcon: ShieldCheck,
    color: '#2563EB',
    bg: '#EFF6FF',
    shortLabel: 'Versicherung',
  },
  'Gesundheit': {
    emoji: '🩺',
    PhIcon: Heart,
    color: '#DB2777',
    bg: '#FDF2F8',
    shortLabel: 'Gesundheit',
  },
  'Schule / Kita': {
    emoji: '🎒',
    PhIcon: BookOpen,
    color: '#D97706',
    bg: '#FFFBEB',
    shortLabel: 'Schule',
  },
  'Steuer': {
    emoji: '📊',
    PhIcon: ChartBar,
    color: '#0F5E3A',
    bg: '#E8F5EF',
    shortLabel: 'Steuer',
  },
  'Bank / Finanzen': {
    emoji: '🏦',
    PhIcon: Buildings,
    color: '#0F9E6A',
    bg: '#E6F5EF',
    shortLabel: 'Bank',
  },
  'Garantie / Kaufbeleg': {
    emoji: '🧾',
    PhIcon: Receipt,
    color: '#EA580C',
    bg: '#FFF7ED',
    shortLabel: 'Garantie',
  },
  'Sonstiges': {
    emoji: '📄',
    PhIcon: File,
    color: '#6B7280',
    bg: '#F3F4F6',
    shortLabel: 'Sonstiges',
  },
};

const FALLBACK: DocTypeConfig = {
  emoji: '📄',
  PhIcon: File,
  color: '#6B7280',
  bg: '#F3F4F6',
  shortLabel: 'Dokument',
};

export function getDocTypeConfig(typ: string | null | undefined): DocTypeConfig {
  const canonical = normalizeDocumentTyp(typ);
  return CONFIG[canonical as CanonicalDocumentType] ?? FALLBACK;
}

export interface DisplayDocumentTypeInfo {
  /**
   * User-facing singular type label for cards/details.
   * Examples: Rechnung, Behördenbrief, MRT-Überweisung
   */
  detailLabel: string;
  /**
   * Refined semantic type used for guards, icon intent and chips.
   * Examples: Rechnungen, Behörden / Amt
   */
  semanticType: string;
  /** Card/list visual config derived from the refined semantic type. */
  config: DocTypeConfig;
}

/**
 * Singular, user-facing label for single-document detail surfaces.
 * When rohText/titel are provided, generic "Formular" is refined to a
 * more specific label if medical referral terms are detected.
 */
export function getDetailTypeLabel(
  typ: string | null | undefined,
  rohText?: string | null,
  titel?: string | null,
): string {
  const raw = (typ ?? '').trim();
  const lower = raw.toLowerCase();

  if (/steuer/.test(lower)) return 'Steuerbescheid';
  if (/bußgeld|bussgeld/.test(lower)) return 'Bußgeldbescheid';
  if (/mahnung/.test(lower)) return 'Mahnung';
  if (/rechnung|rechnungen|invoice/.test(lower)) return 'Rechnung';
  if (/versicherung/.test(lower)) return 'Versicherungsdokument';
  if (/vertrag|verträge/.test(lower)) return 'Vertrag';
  if (/formular/.test(lower)) {
    if (rohText) {
      const haystack = `${rohText} ${titel ?? ''}`;
      if (/\bmrt\b/i.test(haystack) && /[üu]berweisung/i.test(haystack)) return 'MRT-Überweisung';
      if (/[üu]berweisungsschein|[üu]berweisung/i.test(haystack)) return 'Überweisung';
    }
    return 'Formular';
  }
  if (/termin/.test(lower)) return 'Terminbestätigung';
  if (/behörde|behorden|amt|bescheid/.test(lower)) return 'Behördenbrief';

  // Display-time upgrade for legacy weak types using rohText evidence.
  // Does NOT mutate the stored document — display layer only.
  const WEAK_DISPLAY = new Set(['Sonstiges', 'Dokument', 'Unbekannt', 'unknown', '']);
  if (WEAK_DISPLAY.has(raw) && rohText) {
    if (/\b(rechnung|rechnungsnummer|rechnungsdatum|invoice|gesamtsumme|endsumme)\b/i.test(rohText)) return 'Rechnung';
    if (/\b(amtsgericht|landgericht|verwaltungsgericht|aktenzeichen|insolvenzverfahren)\b/i.test(rohText)) return 'Behördenbrief';
    if (/\b(deutsche\s+rentenversicherung|rentenbezugsbescheinigung|drv\s+bund)\b/i.test(rohText)) return 'Behördenbrief';
  }

  return getDocTypeConfig(typ).shortLabel;
}

/**
 * Shared display resolver for compact surfaces (cards/lists/search rows).
 * Keeps detail-grade weak-type refinement while still returning a semantic
 * type that card visuals and guards can use safely.
 */
export function resolveDisplayDocumentType(
  typ: string | null | undefined,
  rohText?: string | null,
  titel?: string | null,
): DisplayDocumentTypeInfo {
  const baseType = (typ ?? '').trim();
  const evidence = [rohText ?? '', titel ?? ''].filter(Boolean).join('\n');
  const semanticType = normalizeAndRefineTyp(baseType || 'Sonstiges', evidence);
  const detailLabel = getDetailTypeLabel(baseType || semanticType, rohText, titel);
  return {
    detailLabel,
    semanticType,
    config: getDocTypeConfig(semanticType),
  };
}
