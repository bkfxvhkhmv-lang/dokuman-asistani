/** Belge görüntü optimizasyonu — boyutlar, shader gövdeleri, yedek matris */

export const MAX_DIM = 1800;

export const ILLUM_SIGMA = 180;
export const SHARP_SIGMA = 1.5;
export const MEAN_DIM = 4;
export const PAPER_DIM = 16;

/** Geniş blur + ortalama + adaptif tonal düzeltme + keskinlik */
export const ADAPTIVE_SKSL = `
uniform shader original;
uniform shader illumBlur;
uniform shader sharpBlur;
uniform float  globalMean;
uniform float  targetWhite;
uniform float  contrastBoost;
uniform float  sharpAmount;
uniform float  localAmount;

half4 main(float2 coord) {
  half4 o  = original.eval(coord);
  half4 ib = illumBlur.eval(coord);
  half4 sb = sharpBlur.eval(coord);

  float globalScale = targetWhite / max(globalMean, 0.10);
  globalScale = clamp(globalScale, 0.85, 1.65);

  float lumIB = 0.299 * ib.r + 0.587 * ib.g + 0.114 * ib.b;
  float ratio = globalMean / max(lumIB, 0.10);
  ratio = clamp(ratio, 0.88, 1.18);
  float localScale = mix(1.0, ratio, localAmount);

  float scale = globalScale * localScale;
  half3 c = clamp(o.rgb * scale, 0.0, 1.0);

  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float sat  = (maxC > 0.01) ? (maxC - minC) / maxC : 0.0;

  float lumC = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

  half3 edgeVec = o.rgb - sb.rgb;
  float edgeStrength = max(max(abs(edgeVec.r), abs(edgeVec.g)), abs(edgeVec.b));
  float textMask = clamp(edgeStrength * 6.0, 0.0, 1.0)
                 * clamp(1.0 - sat * 4.5, 0.0, 1.0);

  float paperOverride = smoothstep(0.86, 0.94, lumC);
  textMask = textMask * (1.0 - paperOverride);

  float lBlend = clamp((lumC - 0.78) / 0.18, 0.0, 1.0);
  lBlend = lBlend * lBlend;

  float satGate = clamp(1.0 - sat * 2.6, 0.0, 1.0);

  float pushAmount = mix(0.65, 0.10, textMask);

  c = mix(c, half3(1.0, 1.0, 1.0), lBlend * satGate * pushAmount);

  c = clamp(c + contrastBoost * c * (1.0 - c) * (c - 0.5), 0.0, 1.0);

  half3 edge = (o.rgb - sb.rgb) * min(globalScale, 2.0);
  c = clamp(c + edge * sharpAmount, 0.0, 1.0);

  return half4(c, o.a);
}
`;

export const BINARIZE_SKSL = `
uniform shader input;
uniform float  threshold;
uniform float  boost;

half4 main(float2 coord) {
  half4 c   = input.eval(coord);
  float lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  lum = clamp(lum * boost - (boost - 1.0) * 0.5, 0.0, 1.0);
  float v   = lum >= threshold ? 1.0 : 0.0;
  return half4(v, v, v, 1.0);
}
`;

export const FALLBACK_MATRIX: number[] = [
  1.5, 0,   0,   0, -0.18,
  0,   1.5, 0,   0, -0.18,
  0,   0,   1.5, 0, -0.18,
  0,   0,   0,   1,  0,
];
