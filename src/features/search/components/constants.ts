/**
 * Arama ekraninda kullanilan sabitler ve dis API tipleri.
 *
 * Tek dosyaya tasindi cunku bircok alt bilesen ayni listelere
 * (SCHNELLSUCHE, TYPEN, RISIKEN) ihtiyac duyuyor; tekrar tanimlama
 * yerine merkezi import.
 */

export type ChipTone = 'default' | 'warning' | 'danger';

/** Arama ekrani aciliriken gosterilen onerilen aramalar. */
export const SCHNELLSUCHE: { label: string; query: string; tone?: ChipTone }[] = [
  { label: 'Überfällig',     query: 'überfällig',    tone: 'danger'  },
  { label: 'Diese Woche',    query: 'diese Woche'                    },
  { label: 'Über 100 €',     query: 'über 100€'                      },
  { label: 'Angaben prüfen', query: 'angaben prüfen', tone: 'warning' },
];

/** Filtre modal'inde dokumenttip secimi. */
export const TYPEN = [
  'alle', 'Rechnung', 'Mahnung', 'Bußgeld', 'Behörde',
  'Steuerbescheid', 'Termin', 'Versicherung', 'Vertrag', 'Sonstiges',
] as const;

/** Filtre modal'inde risk seviyesi secimi. */
export const RISIKEN = ['alle', 'hoch', 'mittel', 'niedrig'] as const;

/** Suchverlauf icinde tutulacak en fazla giris sayisi. */
export const MAX_VERLAUF = 8;

/** Chip animation spring config. */
export const CHIP_SPRING = {
  damping: 14,
  stiffness: 420,
  mass: 0.55,
  useNativeDriver: true,
} as const;

/** V4 backend'inden donen semantik arama sonucu. */
export interface SemanticResult {
  doc_id?: string;
  score?: number;
  title?: string;
  filename?: string;
  snippet?: string;
  doc_type?: string;
  created_at?: string;
}
