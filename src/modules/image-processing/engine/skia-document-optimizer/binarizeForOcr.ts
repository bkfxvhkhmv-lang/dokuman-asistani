import * as FileSystem from 'expo-file-system/legacy';
import {
  Skia,
  ImageFormat,
  TileMode,
  FilterMode,
  MipmapMode,
} from '@shopify/react-native-skia';

import { BINARIZE_SKSL } from './constants';

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
