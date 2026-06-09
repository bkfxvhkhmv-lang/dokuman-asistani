import * as FileSystem from 'expo-file-system/legacy';
import { Skia, ImageFormat, TileMode, FilterMode, MipmapMode } from '@shopify/react-native-skia';

import {
  type ManualAdjustValues,
  valuesToUniforms,
  isIdentity,
} from '@/modules/image-processing/engine/SkiaManualAdjuster.values';

export {
  type ManualAdjustValues,
  DEFAULT_MANUAL_ADJUSTMENTS,
  MANUAL_PRESETS,
  valuesToUniforms,
  isIdentity,
} from '@/modules/image-processing/engine/SkiaManualAdjuster.values';

// ──────────────────────────────────────────────────────────────────────────────
// Manual Adjuster — user-driven slider values (brightness / contrast / clarity /
// shadow removal / saturation). Implemented as an SkSL runtime effect so it is
// deterministic across platforms and independent of any native motor.
// ──────────────────────────────────────────────────────────────────────────────

const SHARP_SIGMA = 1.5;

const ADJUST_SKSL = `
uniform shader original;
uniform shader sharpBlur;          // σ=1.5 high-frequency base for clarity / sharpening
uniform float  brightness;         // -0.30 … +0.30 (perceptual offset)
uniform float  contrast;           //  0.50 … 1.80  (multiplicative S-curve gain)
uniform float  clarity;            //  0.00 … 1.20  (unsharp mask amount)
uniform float  shadow;             //  0.00 … 1.00  (shadow lift amount)
uniform float  saturation;         //  0.00 … 1.30  (1.0 = identity, 0.0 = grayscale)

half4 main(float2 coord) {
  half4 o  = original.eval(coord);
  half4 sb = sharpBlur.eval(coord);
  half3 c  = o.rgb;

  // ── Shadow lift ─────────────────────────────────────────────────────────
  // Lifts only the lower luminance band; mid-tones and highlights untouched.
  float lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  float shadowMask = clamp(1.0 - lum / 0.45, 0.0, 1.0);
  shadowMask = shadowMask * shadowMask;
  c = clamp(c + shadow * 0.40 * shadowMask, 0.0, 1.0);

  // ── Brightness (perceptual offset around 0.5) ───────────────────────────
  c = clamp(c + brightness, 0.0, 1.0);

  // ── Contrast (S-curve around 0.5) ───────────────────────────────────────
  c = clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);

  // ── Saturation (rec.601 luma toward neutral) ────────────────────────────
  float lumOut = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  c = clamp(mix(half3(lumOut, lumOut, lumOut), c, saturation), 0.0, 1.0);

  // ── Clarity / unsharp mask ──────────────────────────────────────────────
  half3 edge = (o.rgb - sb.rgb);
  c = clamp(c + edge * clarity, 0.0, 1.0);

  return half4(c, o.a);
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// applyManualAdjustments — runs the shader and writes a JPEG to cache.
// Returns the original URI unchanged if every slider is at default.
// ──────────────────────────────────────────────────────────────────────────────

export async function applyManualAdjustments(
  uri: string,
  values: ManualAdjustValues,
): Promise<string> {
  if (isIdentity(values)) return uri;

  try {
    const b64    = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const skData = Skia.Data.fromBase64(b64);
    const skImg  = Skia.Image.MakeImageFromEncoded(skData);
    if (!skImg) return uri;

    const w = skImg.width();
    const h = skImg.height();

    const sharpSurface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!sharpSurface) return uri;
    const sharpPaint = Skia.Paint();
    sharpPaint.setImageFilter(
      Skia.ImageFilter.MakeBlur(SHARP_SIGMA, SHARP_SIGMA, TileMode.Clamp, null),
    );
    sharpSurface.getCanvas().drawImage(skImg, 0, 0, sharpPaint);
    sharpSurface.flush();
    const sharpImg = sharpSurface.makeImageSnapshot();

    const effect = Skia.RuntimeEffect.Make(ADJUST_SKSL);
    if (!effect) return uri;

    const origShader  = skImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
    const sharpShader = sharpImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);

    const u = valuesToUniforms(values);
    const adjustShader = effect.makeShaderWithChildren(
      [u.brightness, u.contrast, u.clarity, u.shadow, u.saturation],
      [origShader, sharpShader],
    );
    if (!adjustShader) return uri;

    const surface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!surface) return uri;

    const paint = Skia.Paint();
    paint.setShader(adjustShader);
    surface.getCanvas().drawRect({ x: 0, y: 0, width: w, height: h }, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    const outB64   = snapshot.encodeToBase64(ImageFormat.JPEG, 95);
    const outUri   = `${FileSystem.cacheDirectory}adjust_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(outUri, outB64, { encoding: FileSystem.EncodingType.Base64 });
    return outUri;
  } catch (e) {
    console.warn('[SkiaManualAdjuster] failed:', e);
    return uri;
  }
}
