import React, { useState, useCallback } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * GlassCard — cross-platform glassmorphism, 3-tier render path
 *
 *  Tier 1 – Skia BackdropBlur (installed via `npx expo install @shopify/react-native-skia`)
 *           GPU blur on ALL Android versions (API 21+) and iOS.
 *           Detected automatically at runtime via try-require.
 *
 *  Tier 2 – expo-blur BlurView
 *           iOS:            UIVisualEffectView (native, zero GPU cost)
 *           Android 12+:   RenderEffect (hardware-accelerated)
 *           Android <12:   No blur (graceful no-op)
 *
 *  Tier 3 – Transparent fallback
 *           Always works, never crashes.
 */

// ── Skia detection (module-level) ─────────────────────────────────────────

let SkCanvas:      any = null;
let SkBackdropBlur: any = null;
let SkFill:        any = null;
let skRect:        ((x: number, y: number, w: number, h: number) => any) | null = null;
let skRrect:       ((r: any, rx: number, ry: number) => any) | null = null;

try {
  const S             = require('@shopify/react-native-skia');
  SkCanvas           = S.Canvas;
  SkBackdropBlur     = S.BackdropBlur;
  SkFill             = S.Fill;
  skRect             = S.rect;
  skRrect            = S.rrect;
} catch {
  // Skia not available — expo-blur path used
}

const SKIA_AVAILABLE = SkCanvas !== null;

// ── Props ─────────────────────────────────────────────────────────────────

interface GlassCardProps {
  children:      React.ReactNode;
  style?:        StyleProp<ViewStyle>;
  intensity?:    number;    // blur sigma (default 14 for Skia, maps to ~36 BlurView intensity)
  tint?:         'light' | 'dark' | 'default';
  accentColor?:  string;
  borderRadius?: number;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function GlassCard({
  children,
  style,
  intensity    = 14,
  tint         = 'light',
  accentColor  = '#4361EE',
  borderRadius = 20,
}: GlassCardProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  }, [size.w, size.h]);

  const alpha12 = `${accentColor}1E`;
  const alpha06 = `${accentColor}0F`;
  const blurViewIntensity = Math.round(intensity * 2.6); // σ→BlurView scale

  // Skia clip — computed lazily when size is known
  const skClip = SKIA_AVAILABLE && size.w > 0 && skRect && skRrect
    ? skRrect(skRect(0, 0, size.w, size.h), borderRadius, borderRadius)
    : null;

  return (
    <View
      style={[st.wrapper, { borderRadius, borderColor: `${accentColor}30` }, style]}
      onLayout={onLayout}
    >
      {/* ── Blur layer ────────────────────────────────────────────────── */}
      {SKIA_AVAILABLE && skClip ? (
        <SkCanvas
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          pointerEvents="none"
        >
          <SkBackdropBlur blur={intensity} clip={skClip}>
            <SkFill color="rgba(255,255,255,0.06)" />
          </SkBackdropBlur>
        </SkCanvas>
      ) : (
        <BlurView
          intensity={blurViewIntensity}
          tint={tint}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
      )}

      {/* ── Colour tint gradient ──────────────────────────────────────── */}
      <LinearGradient
        colors={[alpha12, alpha06, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        pointerEvents="none"
      />

      {/* ── Inner glass-edge highlight ─────────────────────────────────── */}
      <View style={[st.innerBorder, { borderRadius }]} pointerEvents="none" />

      {children}
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: {
    overflow:    'hidden',
    borderWidth: 0.5,
  },
  innerBorder: {
    position:    'absolute',
    inset:       0,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.58)',
  },
});
