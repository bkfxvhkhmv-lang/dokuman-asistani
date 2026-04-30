/**
 * S7 — parmakla leke/yazı silme için yer tutucu.
 * Üretim yolu: iz maskeleme + `@shopify/react-native-skia` üzerinden bölgesel süzme / inpainting
 * (arka planda ONNX veya küçük model). Şimdilik dışarıya çıkmaz (`PIPELINE_ENABLED=false`).
 */

export const MAGIC_ERASER_PIPELINE_ENABLED = false;

export interface MagicEraserInput {
  /** Kaynak raster URI (file://). */
  imageUri: string;
  /** Maske: opak bölgeler silinecek — aynı çözünürlükte beklenir (gelecek). */
  maskUri?: string;
}

/** Şu an her zaman `null` — motor kapalı. */
export async function applyMagicEraser(_input: MagicEraserInput): Promise<string | null> {
  return null;
}
