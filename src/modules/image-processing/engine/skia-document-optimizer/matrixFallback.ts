import * as FileSystem from 'expo-file-system/legacy';
import { Skia, ImageFormat } from '@shopify/react-native-skia';

import { FALLBACK_MATRIX } from './constants';

export async function matrixFallback(uri: string): Promise<string> {
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
