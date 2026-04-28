import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LightColors, DarkColors, LightRisk, DarkRisk, S, R,
  type ColorPalette, type RiskPalette, type ShadowTokens,
  type SpacingTokens, type RadiusTokens,
} from './theme';

const THEME_KEY       = '@briefpilot_theme';
const SIMPLE_MODE_KEY = '@briefpilot_simple_mode';

export interface ThemeColors extends ColorPalette {
  hoch: string; mittel: string; niedrig: string;
}

export interface Theme {
  Colors:    ThemeColors;
  S:         SpacingTokens;
  R:         RadiusTokens;
  RiskColors:RiskPalette;
  Shadow:    ShadowTokens;
  isDark:    boolean;
  toggleTheme: () => void;
  background: string;
  primary: string;
  text: string;
  textSecondary: string;
  border: string;
  // #103 Simple Mode
  isSimpleMode:     boolean;
  toggleSimpleMode: () => void;
  /** Scale a font size: ×1.0 normal, ×1.2 simple mode */
  fs: (size: number) => number;
  /** Simple-mode-aware hitSlop multiplier */
  hitSlopScale: number;
  /** false in simple mode → skip decorative animations */
  animationsEnabled: boolean;
}

function buildShadow(isDark: boolean, primary: string): ShadowTokens {
  if (isDark) {
    return {
      // dark surfaces don't cast visible shadows — borders handle separation
      sm: { shadowColor: '#000', shadowOpacity: 0,    shadowRadius: 0,  shadowOffset: { width: 0, height: 0 }, elevation: 0 },
      md: { shadowColor: '#000', shadowOpacity: 0,    shadowRadius: 0,  shadowOffset: { width: 0, height: 0 }, elevation: 0 },
      // primary glow for floating elements (FAB, hero cards)
      lg: { shadowColor: primary, shadowOpacity: 0.40, shadowRadius: 22, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
    };
  }
  return {
    sm: { shadowColor: '#18181B', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    md: { shadowColor: '#18181B', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
    lg: { shadowColor: primary,   shadowOpacity: 0.26, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  };
}

function buildTheme(isDark: boolean): Omit<Theme, 'toggleTheme' | 'isSimpleMode' | 'toggleSimpleMode' | 'fs' | 'hitSlopScale' | 'animationsEnabled'> {
  const base  = isDark ? DarkColors : LightColors;
  const risk  = isDark ? DarkRisk   : LightRisk;
  const Colors: ThemeColors = { ...base, hoch: risk.hoch.color, mittel: risk.mittel.color, niedrig: risk.niedrig.color };
  const Shadow = buildShadow(isDark, base.primary);
  return {
    Colors, S, R, RiskColors: risk, Shadow, isDark,
    background: Colors.bg, primary: Colors.primary,
    text: Colors.text, textSecondary: Colors.textSecondary, border: Colors.border,
  };
}

const _defaultTheme: Theme = {
  ...buildTheme(false),
  toggleTheme:       () => {},
  isSimpleMode:      false,
  toggleSimpleMode:  () => {},
  fs:                (size) => size,
  hitSlopScale:      1,
  animationsEnabled: true,
};
const ThemeContext = createContext<Theme>(_defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme  = useColorScheme();
  const [isDark,      setIsDark]      = useState(systemScheme === 'dark');
  const [isSimpleMode,setIsSimpleMode]= useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(SIMPLE_MODE_KEY),
    ]).then(([themeVal, simpleVal]) => {
      if (themeVal === 'dark')  setIsDark(true);
      if (themeVal === 'light') setIsDark(false);
      if (simpleVal === '1') setIsSimpleMode(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const toggleSimpleMode = useCallback(() => {
    setIsSimpleMode(prev => {
      const next = !prev;
      AsyncStorage.setItem(SIMPLE_MODE_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  // #103 helpers derived from isSimpleMode
  const FONT_SCALE    = isSimpleMode ? 1.2 : 1.0;
  const fs            = useCallback((size: number) => Math.round(size * FONT_SCALE), [FONT_SCALE]);
  const hitSlopScale  = isSimpleMode ? 1.6 : 1.0;
  const animationsEnabled = !isSimpleMode;

  const theme: Theme = {
    ...buildTheme(isDark),
    toggleTheme,
    isSimpleMode,
    toggleSimpleMode,
    fs,
    hitSlopScale,
    animationsEnabled,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): Theme => useContext(ThemeContext);
