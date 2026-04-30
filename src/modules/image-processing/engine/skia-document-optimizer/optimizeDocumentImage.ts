import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  Skia,
  ImageFormat,
  TileMode,
  FilterMode,
  MipmapMode,
} from '@shopify/react-native-skia';

import {
  MAX_DIM,
  ILLUM_SIGMA,
  SHARP_SIGMA,
  ADAPTIVE_SKSL,
} from './constants';
import { computeGlobalMean, computePaperLuminance } from './computeLuminance';
import { matrixFallback } from './matrixFallback';

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

    const illumSurface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!illumSurface) throw new Error(`Illum surface failed ${w}×${h}`);
    const illumPaint = Skia.Paint();
    illumPaint.setImageFilter(
      Skia.ImageFilter.MakeBlur(ILLUM_SIGMA, ILLUM_SIGMA, TileMode.Clamp, null),
    );
    illumSurface.getCanvas().drawImage(skImg, 0, 0, illumPaint);
    illumSurface.flush();
    const illumImg = illumSurface.makeImageSnapshot();

    const sharpSurface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
    if (!sharpSurface) throw new Error(`Sharp surface failed ${w}×${h}`);
    const sharpPaint = Skia.Paint();
    sharpPaint.setImageFilter(
      Skia.ImageFilter.MakeBlur(SHARP_SIGMA, SHARP_SIGMA, TileMode.Clamp, null),
    );
    sharpSurface.getCanvas().drawImage(skImg, 0, 0, sharpPaint);
    sharpSurface.flush();
    const sharpImg = sharpSurface.makeImageSnapshot();

    let globalMean = computePaperLuminance(illumImg, w, h);
    if (!Number.isFinite(globalMean) || globalMean <= 0) {
      globalMean = computeGlobalMean(illumImg, w, h);
    }

    const effect = Skia.RuntimeEffect.Make(ADAPTIVE_SKSL);
    if (!effect) throw new Error('RuntimeEffect compilation failed');

    const origShader  = skImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
    const illumShader = illumImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
    const sharpShader = sharpImg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);

    const adaptiveShader = effect.makeShaderWithChildren(
      [globalMean, 0.94, 1.45, 0.50, 0.20],
      [origShader, illumShader, sharpShader],
    );
    if (!adaptiveShader) throw new Error('makeShaderWithChildren returned null');

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
    return matrixFallback(uri);
  }
}
