// Pure value-translation helpers for SkiaManualAdjuster.
// Kept in a separate file so they can be unit-tested without pulling in
// `@shopify/react-native-skia` (which Jest cannot transform under jest-expo).

export interface ManualAdjustValues {
  brightness: number;       // -100 … +100, default 0
  contrast: number;         // -100 … +100, default 0
  clarity: number;          //   0 … +100, default 0
  shadowRemoval: number;    //   0 … +100, default 0
  saturation?: number;      // -100 … +100, default 0
}

export const DEFAULT_MANUAL_ADJUSTMENTS: ManualAdjustValues = {
  brightness: 0,
  contrast: 0,
  clarity: 0,
  shadowRemoval: 0,
  saturation: 0,
};

export function valuesToUniforms(v: ManualAdjustValues): {
  brightness: number;
  contrast: number;
  clarity: number;
  shadow: number;
  saturation: number;
} {
  const b = Math.max(-100, Math.min(100, v.brightness ?? 0));
  const c = Math.max(-100, Math.min(100, v.contrast ?? 0));
  const k = Math.max(0,    Math.min(100, v.clarity ?? 0));
  const s = Math.max(0,    Math.min(100, v.shadowRemoval ?? 0));
  const sat = Math.max(-100, Math.min(100, v.saturation ?? 0));

  return {
    brightness: b * 0.003,
    contrast:   1.0 + (c >= 0 ? c * 0.008 : c * 0.005),
    clarity:    k * 0.012,
    shadow:     s * 0.01,
    saturation: sat >= 0 ? 1.0 + sat * 0.003 : 1.0 + sat * 0.01,
  };
}

export function isIdentity(v: ManualAdjustValues): boolean {
  return (v.brightness ?? 0) === 0
      && (v.contrast ?? 0) === 0
      && (v.clarity ?? 0) === 0
      && (v.shadowRemoval ?? 0) === 0
      && (v.saturation ?? 0) === 0;
}

// Built-in adjustment presets — discoverable through `MANUAL_PRESETS`.
export const MANUAL_PRESETS: Record<string, ManualAdjustValues> = {
  identity:  { brightness:   0, contrast:   0, clarity:   0, shadowRemoval:   0, saturation:   0 },
  bw:        { brightness:   0, contrast:  35, clarity:  20, shadowRemoval:  10, saturation: -100 },
  punch:     { brightness:   5, contrast:  25, clarity:  15, shadowRemoval:   8, saturation:  10 },
  softlight: { brightness:  10, contrast:  -8, clarity:   0, shadowRemoval:  20, saturation:   0 },
};
