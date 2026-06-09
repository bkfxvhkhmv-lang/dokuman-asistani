/**
 * Manual Adjust UI'a ozgu tipler ve preset listesi.
 *
 * Bu dosya runtime kod tasimaz disinda PRESETS dizisi disinda; UI
 * tarafindan kullanilan i18n key + ikon eslesmesi tek noktadan
 * yonetilsin diye burada.
 */
import type { MANUAL_PRESETS } from '@/modules/image-processing/engine/SkiaManualAdjuster';

export interface PresetButton {
  id: keyof typeof MANUAL_PRESETS;
  labelKey: string;
  icon: string;
}

/** Ust seritte gosterilecek preset siralamasi.
 *  Gerekirse ekleme/cikarma burada yapilir; UI otomatik adapte olur. */
export const PRESETS: PresetButton[] = [
  { id: 'identity',  labelKey: 'scan.preset_identity',  icon: 'image-outline' },
  { id: 'bw',        labelKey: 'scan.preset_bw',        icon: 'contrast-outline' },
  { id: 'punch',     labelKey: 'scan.preset_punch',     icon: 'sparkle' },
  { id: 'softlight', labelKey: 'scan.preset_softlight', icon: 'sun' },
];

/** Genel translate fonksiyonu — useScanI18n cikti tipi. */
export type T = (key: string) => string;
