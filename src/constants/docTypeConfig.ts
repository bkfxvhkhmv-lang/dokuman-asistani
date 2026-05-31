import type React from 'react';
import {
  Money, WarningCircle, FileText, Buildings, ShieldCheck,
  Heart, BookOpen, ChartBar, Receipt, File,
} from 'phosphor-react-native';
import {
  normalizeDocumentTyp,
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

/** Singular, user-facing label for single-document detail surfaces. */
export function getDetailTypeLabel(typ: string | null | undefined): string {
  const raw = (typ ?? '').trim();
  const lower = raw.toLowerCase();

  if (/steuer/.test(lower)) return 'Steuerbescheid';
  if (/bußgeld|bussgeld/.test(lower)) return 'Bußgeldbescheid';
  if (/mahnung/.test(lower)) return 'Mahnung';
  if (/rechnung|rechnungen|invoice/.test(lower)) return 'Rechnung';
  if (/versicherung/.test(lower)) return 'Versicherungsdokument';
  if (/vertrag|verträge/.test(lower)) return 'Vertrag';
  if (/formular/.test(lower)) return 'Formular';
  if (/termin/.test(lower)) return 'Terminbestätigung';
  if (/behörde|behorden|amt|bescheid/.test(lower)) return 'Behördenbrief';

  return getDocTypeConfig(typ).shortLabel;
}
