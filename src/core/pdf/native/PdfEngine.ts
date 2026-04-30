/**
 * Baremetal PDF çıktısı — iOS (UIGraphicsPDFRenderer) ve Android (android.graphics.pdf.PdfDocument).
 * Modül eksik veya hata olursa `null` döner; üst zincir pdf-lib fallback’ına geçer.
 */
import { NativeModules, Platform } from 'react-native';

export interface NativePdfPage {
  imageUri: string;
  ocrText?: string;
  width: number;
  height: number;
}

export interface NativePdfOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  dpi?: number;
  quality?: number;
}

export interface NativePdfResult {
  uri: string;
  fileSize: number;
  isSearchable: boolean;
}

type BriefPilotPdfEngineNative = {
  generatePdf(payload: {
    pages: Array<Partial<Pick<NativePdfPage, 'imageUri' | 'ocrText' | 'width' | 'height'>>>;
    options?: NativePdfOptions;
  }): Promise<{ uri: string; fileSize: number; isSearchable: boolean }>;
};

const Engine = NativeModules.BriefPilotPdfEngine as BriefPilotPdfEngineNative | undefined;

export async function nativeGeneratePdf(
  pages: NativePdfPage[],
  options?: NativePdfOptions,
): Promise<NativePdfResult | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  if (!Engine?.generatePdf || pages.length === 0) return null;

  try {
    const res = await Engine.generatePdf({
      pages: pages.map(p => ({
        imageUri: p.imageUri,
        ocrText: p.ocrText,
        width: p.width,
        height: p.height,
      })),
      options,
    });

    let uri = res.uri ?? '';
    if (!uri.startsWith('file://') && uri.length > 0) {
      uri = uri.startsWith('/') ? `file://${uri}` : uri;
    }
    return {
      uri,
      fileSize: typeof res.fileSize === 'number' ? res.fileSize : 0,
      isSearchable: !!res.isSearchable,
    };
  } catch {
    return null;
  }
}

export async function nativeAddOcrLayer(
  _pdfUri: string,
  _pages: Array<{ text: string; pageIndex: number }>,
): Promise<string | null> {
  return null;
}

export async function nativeEmbedMetadata(
  _pdfUri: string,
  _meta: NativePdfOptions,
): Promise<string | null> {
  return null;
}
