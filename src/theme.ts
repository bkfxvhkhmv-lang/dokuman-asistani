export interface ColorPalette {
  primary: string; primaryLight: string; primaryMid: string; primaryDark: string;
  danger: string; dangerLight: string; dangerBorder: string; dangerText: string;
  warning: string; warningLight: string; warningBorder: string; warningText: string;
  success: string; successLight: string; successBorder: string; successText: string;
  bg: string; bgCard: string; card: string; bgInput: string;
  border: string; borderLight: string;
  text: string; textSecondary: string; textTertiary: string; textInverse: string;
}

export interface RiskEntry {
  color: string; bg: string; border: string; text: string; label: string;
}
export type RiskPalette = Record<'hoch' | 'mittel' | 'niedrig', RiskEntry>;

export interface ShadowToken {
  shadowColor: string; shadowOpacity: number; shadowRadius: number;
  shadowOffset: { width: number; height: number }; elevation: number;
}
export interface ShadowTokens { sm: ShadowToken; md: ShadowToken; lg: ShadowToken; }
export type SpacingTokens = Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl', number>;
export type RadiusTokens = Record<'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full', number>;

export const LightColors: ColorPalette = {
  // Brand — deep indigo (Klarna/Revolut feel)
  primary: '#4361EE', primaryLight: '#EEF1FD', primaryMid: '#7089F4', primaryDark: '#2A45C2',
  // Semantic — coral (warmer, less harsh than pure red)
  danger: '#EE6055', dangerLight: '#FEF0EF', dangerBorder: '#F8ACA8', dangerText: '#9B2D24',
  // Semantic — goldenrod (richer, less muddy than amber)
  warning: '#FFB703', warningLight: '#FFF8E0', warningBorder: '#FFD44D', warningText: '#5C3D00',
  // Semantic — teal green (unchanged — already premium)
  success: '#1D9E75', successLight: '#E8F5EF', successBorder: '#5DCAA5', successText: '#0F5233',
  // Surfaces
  bg: '#F5F4F0', bgCard: '#FFFFFF', card: '#FFFFFF', bgInput: '#F2F1ED',
  // Borders — hairline (1 ton fark)
  border: '#E8E7E1', borderLight: '#F0EFE9',
  // Typography
  text: '#18181B', textSecondary: '#6B6B72', textTertiary: '#B0B0B8', textInverse: '#FFFFFF',
};

export const DarkColors: ColorPalette = {
  primary: '#7B74E8', primaryLight: '#2A2760', primaryMid: '#9B96F0', primaryDark: '#5850CC',
  danger: '#FF6B6B', dangerLight: '#3A1A1A', dangerBorder: '#8B3333', dangerText: '#FF9B9B',
  warning: '#FFB830', warningLight: '#3A2A00', warningBorder: '#8B6000', warningText: '#FFD080',
  success: '#2ED882', successLight: '#0A2A1A', successBorder: '#1A6B3A', successText: '#5EFFA8',
  bg: '#0F0F17', bgCard: '#1A1A26', card: '#1A1A26', bgInput: '#252535',
  border: '#2A2A40', borderLight: '#222235',
  text: '#F0F0F8', textSecondary: '#9090A8', textTertiary: '#5A5A70', textInverse: '#0F0F17',
};

export const LightRisk: RiskPalette = {
  hoch:    { color: '#EE6055', bg: '#FEF0EF', border: '#F8ACA8', text: '#9B2D24', label: 'Dringend' },
  mittel:  { color: '#FFB703', bg: '#FFF8E0', border: '#FFD44D', text: '#5C3D00', label: 'Diese Woche' },
  niedrig: { color: '#1D9E75', bg: '#E8F5EF', border: '#5DCAA5', text: '#0F5233', label: 'Kein Handlungsbedarf' },
};

export const DarkRisk: RiskPalette = {
  hoch:    { color: '#FF6B6B', bg: '#3A1A1A', border: '#8B3333', text: '#FF9B9B', label: 'Dringend' },
  mittel:  { color: '#FFB830', bg: '#3A2A00', border: '#8B6000', text: '#FFD080', label: 'Diese Woche' },
  niedrig: { color: '#2ED882', bg: '#0A2A1A', border: '#1A6B3A', text: '#5EFFA8', label: 'Kein Handlungsbedarf' },
};

export const Shadow: ShadowTokens = {
  sm: { shadowColor: '#18181B', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  md: { shadowColor: '#18181B', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  lg: { shadowColor: '#4361EE', shadowOpacity: 0.26, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
};

export const S: SpacingTokens = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const R: RadiusTokens  = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 };
export const Colors = LightColors;

// ── Touch targets — minimum 44×44pt (Apple HIG / Material 48dp) ──────────
export const HIT_SLOP    = { top: 12, bottom: 12, left: 12, right: 12 } as const;
export const HIT_SLOP_LG = { top: 22, bottom: 22, left: 22, right: 22 } as const;
