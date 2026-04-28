import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ProfileSpec } from './compressionProfiles';

export interface NormalizeResult {
  uri: string;
  width: number;
  height: number;
  wasResized: boolean;
}

/**
 * Normalize an image to the target DPI spec for a given compression profile.
 * Preserves aspect ratio — if image is narrower than A4 portrait ratio (0.707),
 * constrains by width; if taller, constrains by height.
 * Never upscales beyond 2× original dimensions.
 */
export async function normalizeForDpi(
  uri: string,
  originalWidth: number,
  originalHeight: number,
  profile: ProfileSpec,
): Promise<NormalizeResult> {
  const { targetWidthPx, targetHeightPx, jpegQuality } = profile;

  // Determine scale: fit within target box without upscaling
  const scaleByW = targetWidthPx / originalWidth;
  const scaleByH = targetHeightPx / originalHeight;
  const scale = Math.min(scaleByW, scaleByH, 1); // never upscale

  const outW = Math.round(originalWidth * scale);
  const outH = Math.round(originalHeight * scale);

  // Always run through manipulateAsync — even at scale≈1 — to strip EXIF rotation.
  // Skipping this causes landscape-EXIF images to appear in querformat inside the PDF
  // because expo-print / the PDF renderer ignores EXIF orientation tags.
  const actions: Parameters<typeof manipulateAsync>[1] =
    Math.abs(scale - 1) < 0.01
      ? []                                              // no resize, just re-encode (strips EXIF)
      : [{ resize: { width: outW, height: outH } }];   // resize + strip EXIF

  const result = await manipulateAsync(uri, actions, { compress: jpegQuality, format: SaveFormat.JPEG });
  return { uri: result.uri, width: outW, height: outH, wasResized: Math.abs(scale - 1) >= 0.01 };
}

/**
 * Estimate the effective DPI of an image given its pixel dimensions
 * assuming it represents an A4 page (210mm × 297mm).
 */
export function estimateDpi(width: number, height: number): number {
  const A4_WIDTH_MM = 210;
  const MM_PER_INCH = 25.4;
  return Math.round((width / A4_WIDTH_MM) * MM_PER_INCH);
}
