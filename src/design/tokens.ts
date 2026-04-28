import { LightColors, LightRisk, Shadow, S, R } from '../theme';
import type { SpacingTokens, RadiusTokens } from '../theme';

export const DesignColors = LightColors;
export const DesignRiskColors = LightRisk;
export const DesignShadow = Shadow;
export const DesignSpacing: SpacingTokens = S;
export const DesignRadius: RadiusTokens = R;

export interface TypographyStyle {
  fontSize: number;
  fontWeight: string;
  letterSpacing?: number;
  lineHeight?: number;
}

export const DesignTypography: Record<string, TypographyStyle> = {
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  title:   { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  body:    { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  label:   { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
};
