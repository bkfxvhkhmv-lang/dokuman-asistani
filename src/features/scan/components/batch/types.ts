/**
 * Batch view alt bilesenlerinin paylastiği tipler.
 * Sadece TypeScript imza tasiyicidir; runtime kod yok.
 */

/** Toplu tarama listesindeki tek bir sayfanin UI temsili. */
export interface BatchPageData {
  id: string;
  order: number;
  imageSession: {
    originalUri: string;
    finalUri: string;
    previewUri?: string;
    enhancedUri?: string;
    croppedUri?: string;
    correctedUri?: string;
    quality?: { overallScore: number };
    activeFilter?: string;
  };
  filter?: string;
  enhanced?: boolean;
}

/** Filitre seridindeki tek bir filtre on-tanim. */
export interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/** Genel translate fonksiyonu — useScanI18n cikti tipi. */
export type T = (key: string) => string;
