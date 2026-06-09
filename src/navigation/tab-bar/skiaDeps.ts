/**
 * Skia bagimli backdrop blur — yalnizca Android'de kullanilir.
 *
 * Skia paketi yuklenmemis veya Android disi platformlardayken
 * fallback'lerle calisilir. Try-catch koruma altinda require ediyoruz
 * ki bundle hatasi olmasin.
 */
import { Platform } from 'react-native';

interface SkiaModule {
  Canvas:        any;
  BackdropBlur:  any;
  Fill:          any;
  rect:          any;
  rrect:         any;
}

let skia: Partial<SkiaModule> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const S = require('@shopify/react-native-skia');
  skia = {
    Canvas:       S.Canvas,
    BackdropBlur: S.BackdropBlur,
    Fill:         S.Fill,
    rect:         S.rect,
    rrect:        S.rrect,
  };
} catch {
  // Skia bulunamadi — sadece native blur'a (iOS) duseriz.
}

export const SkCanvas       = skia.Canvas       ?? null;
export const SkBackdropBlur = skia.BackdropBlur ?? null;
export const SkFill         = skia.Fill         ?? null;
export const skRect         = skia.rect         ?? null;
export const skRrect        = skia.rrect        ?? null;

/** Platform + module guard — Android'de Skia kullanilabilir mi? */
export const SKIA_OK: boolean = SkCanvas !== null && Platform.OS === 'android';
