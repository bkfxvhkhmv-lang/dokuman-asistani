import { LightColors, LightRisk, Shadow, S, R } from '@/theme';
import type { SpacingTokens, RadiusTokens } from '@/theme';
import type { TextStyle } from 'react-native';

export const DesignColors = LightColors;
export const DesignRiskColors = LightRisk;
export const DesignShadow = Shadow;
export const DesignSpacing: SpacingTokens = S;
export const DesignRadius: RadiusTokens = R;

export interface TypographyStyle {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
  lineHeight?: number;
}

/**
 * Premium type scale — single source of truth for all UI text.
 *
 * heroNumber  Large data point (Betrag, Frist, big stat)
 * title       Card/section heading
 * body        Primary readable text
 * meta        Secondary/supporting info
 * label       Uppercase section badge, eyebrow
 *
 * Legacy aliases (display, heading, eyebrow) kept for backward compat.
 */
export const DesignTypography: Record<string, TypographyStyle> = {
  // ── Premium scale ────────────────────────────────────────────────────────
  heroNumber: { fontSize: 26, fontWeight: '700', lineHeight: 32, letterSpacing: -0.3 },
  title:      { fontSize: 17, fontWeight: '600', lineHeight: 24, letterSpacing: -0.1 },
  body:       { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  meta:       { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label:      { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.8 },
  // ── Legacy aliases (do not remove — referenced in design components) ─────
  display:    { fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },
  heading:    { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  eyebrow:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
};

/** Short alias for convenience: `T.heroNumber`, `T.title`, `T.body` … */
export const T = DesignTypography;
