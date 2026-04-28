/**
 * Native PDF engine binding point.
 * Wire up a native module here (e.g., react-native-pdf-lib, libharu, or OpenCV PDF writer)
 * to unlock:
 *   - True PDF/A compliance
 *   - Font embedding
 *   - Vector graphics support
 *   - Native compression codecs (CCITT for B&W, JPEG2000 for color)
 *   - Structured PDF with real text objects (not HTML-based)
 *
 * Until native is available, all functions return null → caller falls back to HTML path.
 */

export interface NativePdfPage {
  imageUri: string;  // normalized JPEG
  ocrText?: string;  // searchable text layer
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

export async function nativeGeneratePdf(
  _pages: NativePdfPage[],
  _options?: NativePdfOptions,
): Promise<NativePdfResult | null> {
  return null;
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
