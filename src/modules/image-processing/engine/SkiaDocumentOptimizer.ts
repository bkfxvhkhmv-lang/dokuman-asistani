import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Skia, ImageFormat, TileMode, FilterMode, MipmapMode } from '@shopify/react-native-skia';

const MAX_DIM = 1800;

// ──────────────────────────────────────────────────────────────────────────────
// Document Image Optimizer — pipeline:
//
//  1. Illumination normalization  (σ=60 blur → shadow removal)
//  2. White balance push          (saturation-aware → paper → white, colors kept)
//  3. S-curve contrast            (aggressive: separates text from background)
//  4. Unsharp mask                (σ=1.5 blur → text sharpness)
//
// Two blur passes run on the GPU before the main shader:
//   blurred     σ=60  → regional illumination map  (shadow / vignette removal)
//   sharpBlur   σ=1.5 → high-frequency base        (unsharp mask reference)
// ──────────────────────────────────────────────────────────────────────────────

const ILLUM_SIGMA = 60;   // large: captures broad shadows
const SHARP_SIGMA = 1.5;  // small: keeps edge detail for sharpening

const ADAPTIVE_SKSL = `
uniform shader original;
uniform shader illumBlur;   // σ=60: illumination/shadow map
uniform shader sharpBlur;   // σ=1.5: unsharp-mask base
uniform float  targetWhite;
uniform float  contrastBoost;
uniform float  sharpAmount;

half4 main(float2 coord) {
  half4 o  = original.eval(coord);
  half4 ib = illumBlur.eval(coord);
  half4 sb = sharpBlur.eval(coord);

  // ── 1. Illumination normalization (shadow / uneven lighting removal) ───────
  float lumIB = 0.299 * ib.r + 0.587 * ib.g + 0.114 * ib.b;
  float scale = targetWhite / max(lumIB, 0.04);
  scale       = clamp(scale, 0.5, 4.0);
  half3 c     = clamp(o.rgb * scale, 0.0, 1.0);

  // ── 2. White balance push (saturation-aware) ──────────────────────────────
  // Only push low-saturation (paper/grayscale) areas toward white.
  // Colored logos, stamps, text → saturation blocks the push → colors survive.
  float maxC  = max(max(c.r, c.g), c.b);
  float minC  = min(min(c.r, c.g), c.b);
  float sat   = (maxC > 0.01) ? (maxC - minC) / maxC : 0.0;

  float lumC  = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  // smoothstep 0→1 as lumC goes 0.58→0.90
  float lBlend = clamp((lumC - 0.58) / 0.32, 0.0, 1.0);
  lBlend       = lBlend * lBlend * (3.0 - 2.0 * lBlend);
  // saturation gate: sat=0 → full push / sat=0.35 → no push
  float satGate = clamp(1.0 - sat * 2.85, 0.0, 1.0);
  c = mix(c, half3(1.0, 1.0, 1.0), lBlend * satGate * 0.80);

  // ── 3. S-curve contrast ───────────────────────────────────────────────────
  // f(x) = x + k·x·(1-x)·(x-0.5)  — symmetric cubic, lifts darks / crushes lights
  c = clamp(c + contrastBoost * c * (1.0 - c) * (c - 0.5), 0.0, 1.0);

  // ── 4. Unsharp mask ────────────────────────────────────────────────────────
  // edge = original detail above the low-pass base, scaled by the illumination factor
  half3 edge = (o.rgb - sb.rgb) * min(scale, 2.5);
  c = clamp(c + edge * sharpAmount, 0.0, 1.0);

  return half4(c, o.a);
}
`;

// Binarize pass — for OCR: converts optimized image to high-contrast B&W
const BINARIZE_SKSL = `
uniform shader input;
uniform float  threshold;
uniform float  boost;

half4 main(float2 coord) {
  half4 c   = input.eval(coord);
  float lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  // Apply boost before threshold to separate text from background
  lum = clamp(lum * boost - (boost - 1.0) * 0.5, 0.0, 1.0);
  float v   = lum >= threshold ? 1.0 : 0.0;
  return half4(v, v, v, 1.0);
}
`;

// Fallback: color-preserving brightness+contrast matrix (no Skia shader support)
const FALLBACK_MATRIX: number[] = [
  1.5, 0,   0,   0, -0.18,
  0,   1.5, 0,   0, -0.18,
  0,   0,   1.5, 0, -0.18,
  0,   0,   0,   1,  0,
];

// ── Main export ───────────────────────────────────────────────────────────────

export async function optimizeDocumentImage(uri: string): Promise<string> {
  try {
    let workUri = uri;

    let b64    = await FileSystem.readAsStringAsync(workUri, { encoding: FileSystem.EncodingType.Base64 });
    let skData = Skia.Data.fromBase64(b64);
    let skImg  = Skia.Image.MakeImageFromEncoded(skData);
    if (!skImg) throw new Error('MakeImageFromEncoded returned null');

    const origW = skImg.width();
    const origH = skImg.height();

    if (Math.max(origW, origH) > MAX_DIM) {
      const scale   = MAX_DIM / Math.max(origW, origH);
      const resized = await manipulateAsync(
        workUri,
        [{ resize: { width: Math.round(origW * scale) } }],
        { compress: 0.95, format: SaveFormat.JPEG },
      );
      workUri = resized.uri;
      b64     = await FileSystem.readAsStringAsync(workUri, { encoding: FileSystem.EncodingType.Base64 });
      skData  = Skia.Data.fromBase64(b64);
      skImg   = Skia.Image.MakeImageFromEncoded(skData);
      if (!skImg) throw new Error('MakeImageFromEncoded (resized) returned null');
    }

    const w = skImg.width();
    const h = skImg.height();

    // ── Blur pass 1: illumination map (σ=60) ─────────────────────────────────
    const illumSurface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!illumSurface) throw new Error(`Illum surface failed ${w}×${h}`);
    const illumPaint = Skia.Paint();
    illumPaint.setImageFilter(
      Skia.ImageFilter.MakeBlur(ILLUM_SIGMA, ILLUM_SIGMA, TileMode.Clamp, null)
    );
    illumSurface.getCanvas().drawImage(skImg, 0, 0, illumPaint);
    illumSurface.flush();
    const illumImg = illumSurface.makeImageSnapshot();

    // ── Blur pass 2: sharpness base (σ=1.5) ──────────────────────────────────
    const sharpSurface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!sharpSurface) throw new Error(`Sharp surface failed ${w}×${h}`);
    const sharpPaint = Skia.Paint();
    sharpPaint.setImageFilter(
      Skia.ImageFilter.MakeBlur(SHARP_SIGMA, SHARP_SIGMA, TileMode.Clamp, null)
    );
    sharpSurface.getCanvas().drawImage(skImg, 0, 0, sharpPaint);
    sharpSurface.flush();
    const sharpImg = sharpSurface.makeImageSnapshot();

    // ── Compile adaptive shader ───────────────────────────────────────────────
    const effect = Skia.RuntimeEffect.Make(ADAPTIVE_SKSL);
    if (!effect) throw new Error('RuntimeEffect compilation failed');

    const origShader   = skImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
    const illumShader  = illumImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
    const sharpShader  = sharpImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);

    // uniforms order: targetWhite, contrastBoost, sharpAmount
    const adaptiveShader = effect.makeShaderWithChildren(
      [0.95, 2.5, 0.7],
      [origShader, illumShader, sharpShader],
    );
    if (!adaptiveShader) throw new Error('makeShaderWithChildren returned null');

    // ── Render ────────────────────────────────────────────────────────────────
    const surface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!surface) throw new Error(`Output surface failed ${w}×${h}`);

    const paint = Skia.Paint();
    paint.setShader(adaptiveShader);
    surface.getCanvas().drawRect({ x: 0, y: 0, width: w, height: h }, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    const outB64   = snapshot.encodeToBase64(ImageFormat.JPEG, 95);
    const outUri   = `${FileSystem.cacheDirectory}doc_opt_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(outUri, outB64, { encoding: FileSystem.EncodingType.Base64 });

    return outUri;
  } catch (e) {
    console.warn('[SkiaDocumentOptimizer] adaptive failed, using matrix fallback:', e);
    return _matrixFallback(uri);
  }
}

// ── OCR-optimized binarized output ───────────────────────────────────────────
// Call AFTER optimizeDocumentImage. Produces high-contrast B&W for OCR engines.

export async function binarizeForOCR(optimizedUri: string): Promise<string> {
  try {
    const b64    = await FileSystem.readAsStringAsync(optimizedUri, { encoding: FileSystem.EncodingType.Base64 });
    const skData = Skia.Data.fromBase64(b64);
    const skImg  = Skia.Image.MakeImageFromEncoded(skData);
    if (!skImg) return optimizedUri;

    const w = skImg.width();
    const h = skImg.height();

    const effect = Skia.RuntimeEffect.Make(BINARIZE_SKSL);
    if (!effect) return optimizedUri;

    const inputShader = skImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
    // threshold=0.55, boost=1.4 — pushes paper to white, text to black cleanly
    const bShader = effect.makeShaderWithChildren([0.55, 1.4], [inputShader]);
    if (!bShader) return optimizedUri;

    const surface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!surface) return optimizedUri;

    const paint = Skia.Paint();
    paint.setShader(bShader);
    surface.getCanvas().drawRect({ x: 0, y: 0, width: w, height: h }, paint);
    surface.flush();

    const outB64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 98);
    const outUri = `${FileSystem.cacheDirectory}doc_ocr_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(outUri, outB64, { encoding: FileSystem.EncodingType.Base64 });
    return outUri;
  } catch {
    return optimizedUri;
  }
}

// ── Matrix fallback ───────────────────────────────────────────────────────────

async function _matrixFallback(uri: string): Promise<string> {
  try {
    const b64    = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const skData = Skia.Data.fromBase64(b64);
    const skImg  = Skia.Image.MakeImageFromEncoded(skData);
    if (!skImg) return uri;

    const w = skImg.width();
    const h = skImg.height();

    const surface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!surface) return uri;

    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(FALLBACK_MATRIX));
    surface.getCanvas().drawImage(skImg, 0, 0, paint);
    surface.flush();

    const outB64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 95);
    const outUri = `${FileSystem.cacheDirectory}doc_fallback_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(outUri, outB64, { encoding: FileSystem.EncodingType.Base64 });
    return outUri;
  } catch {
    return uri;
  }
}
