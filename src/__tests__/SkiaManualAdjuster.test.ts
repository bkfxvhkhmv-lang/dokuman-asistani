import {
  valuesToUniforms,
  isIdentity,
  DEFAULT_MANUAL_ADJUSTMENTS,
  MANUAL_PRESETS,
} from '@/modules/image-processing/engine/SkiaManualAdjuster.values';

describe('SkiaManualAdjuster — value translation', () => {
  it('default values map to shader identity', () => {
    const u = valuesToUniforms(DEFAULT_MANUAL_ADJUSTMENTS);
    expect(u.brightness).toBe(0);
    expect(u.contrast).toBeCloseTo(1.0);
    expect(u.clarity).toBe(0);
    expect(u.shadow).toBe(0);
    expect(u.saturation).toBeCloseTo(1.0);
  });

  it('extreme positive sliders stay within tasteful ranges', () => {
    const u = valuesToUniforms({ brightness: 100, contrast: 100, clarity: 100, shadowRemoval: 100, saturation: 100 });
    expect(u.brightness).toBeCloseTo(0.30);
    expect(u.contrast).toBeCloseTo(1.80);
    expect(u.clarity).toBeCloseTo(1.20);
    expect(u.shadow).toBeCloseTo(1.00);
    expect(u.saturation).toBeCloseTo(1.30);
  });

  it('extreme negative sliders stay within tasteful ranges', () => {
    const u = valuesToUniforms({ brightness: -100, contrast: -100, clarity: 0, shadowRemoval: 0, saturation: -100 });
    expect(u.brightness).toBeCloseTo(-0.30);
    expect(u.contrast).toBeCloseTo(0.50);
    expect(u.saturation).toBeCloseTo(0);
  });

  it('clamps out-of-range UI values', () => {
    const u = valuesToUniforms({
      brightness: 1000,
      contrast: -1000,
      clarity: -50,
      shadowRemoval: 200,
      saturation: 9999,
    } as any);
    expect(u.brightness).toBeCloseTo(0.30);
    expect(u.contrast).toBeCloseTo(0.50);
    expect(u.clarity).toBe(0);
    expect(u.shadow).toBeCloseTo(1.00);
    expect(u.saturation).toBeCloseTo(1.30);
  });
});

describe('SkiaManualAdjuster — identity detection', () => {
  it('default values are identity', () => {
    expect(isIdentity(DEFAULT_MANUAL_ADJUSTMENTS)).toBe(true);
  });

  it('any non-zero slider breaks identity', () => {
    expect(isIdentity({ ...DEFAULT_MANUAL_ADJUSTMENTS, brightness: 1 })).toBe(false);
    expect(isIdentity({ ...DEFAULT_MANUAL_ADJUSTMENTS, contrast: -1 })).toBe(false);
    expect(isIdentity({ ...DEFAULT_MANUAL_ADJUSTMENTS, clarity: 1 })).toBe(false);
    expect(isIdentity({ ...DEFAULT_MANUAL_ADJUSTMENTS, shadowRemoval: 1 })).toBe(false);
    expect(isIdentity({ ...DEFAULT_MANUAL_ADJUSTMENTS, saturation: 1 })).toBe(false);
  });
});

describe('SkiaManualAdjuster — built-in presets', () => {
  it('identity preset is detected as identity', () => {
    expect(isIdentity(MANUAL_PRESETS.identity)).toBe(true);
  });

  it('bw preset desaturates fully and adds contrast', () => {
    expect(MANUAL_PRESETS.bw.saturation).toBe(-100);
    expect(MANUAL_PRESETS.bw.contrast).toBeGreaterThan(0);
  });

  it('punch preset increases contrast and clarity', () => {
    const p = MANUAL_PRESETS.punch;
    expect(p.contrast).toBeGreaterThan(0);
    expect(p.clarity).toBeGreaterThan(0);
  });

  it('softlight preset lifts shadows without crushing contrast', () => {
    const p = MANUAL_PRESETS.softlight;
    expect(p.shadowRemoval).toBeGreaterThan(0);
    expect(p.contrast).toBeLessThanOrEqual(0);
  });
});
