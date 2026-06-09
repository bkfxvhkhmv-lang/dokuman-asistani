let SkCanvas: any = null;
let SkRect: any = null;
let SkLinearGrad: any = null;
let skVec: any = null;
try {
  const S = require('@shopify/react-native-skia');
  SkCanvas = S.Canvas;
  SkRect = S.Rect;
  SkLinearGrad = S.LinearGradient;
  skVec = S.vec;
} catch {
  /* optional Skia — graceful fallback when not installed */
}

export const SKIA_OK = SkCanvas !== null;
export { SkCanvas, SkRect, SkLinearGrad, skVec };
