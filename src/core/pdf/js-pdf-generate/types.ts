/** `PdfGenerator` metadata alt kümesi — döngüsel importtan kaçınılması için */
export interface PdfLibMetadataSlice {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

export interface PdfLibPageSource {
  uri: string;
  width?: number;
  height?: number;
  ocrText?: string;
  /** Belge/metadata ile hizalı; pdf-lib ile sayfa çıktısı yönünü günceller */
  rotation?: 0 | 90 | 180 | 270;
}
