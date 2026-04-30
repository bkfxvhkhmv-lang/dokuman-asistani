/**
 * Bottom tab bar arka planinda cam (frosted glass) etkisi.
 *
 * iOS:    expo-blur'un native blur'i + ince beyaz overlay
 * Android: Skia BackdropBlur (varsa) + ust sheen + theme tint
 *          Skia yok ise duz semi-transparent beyaz fallback
 */
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ColorPalette } from '@/theme';
import { SKIA_OK, SkCanvas, SkBackdropBlur, SkFill, skRect, skRrect } from '@/navigation/tab-bar/skiaDeps';
import { tabStyles as st } from '@/navigation/tab-bar/styles';

interface Props {
  colors:  ColorPalette;
  tabSize: { w: number; h: number };
}

export default function GlassLayer({ colors, tabSize }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, st.glassClip]}>
      {Platform.OS === 'ios' ? (
        <>
          <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        </>
      ) : (
        <>
          {SKIA_OK && tabSize.w > 0 && skRect && skRrect ? (
            <SkCanvas style={StyleSheet.absoluteFill} pointerEvents="none">
              <SkBackdropBlur
                blur={22}
                clip={skRrect(skRect(0, 0, tabSize.w, tabSize.h), 28, 28)}
              >
                <SkFill color="rgba(248,250,255,0.34)" />
              </SkBackdropBlur>
            </SkCanvas>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(250,251,255,0.82)' }]} />
          )}

          {/* Android primary tint */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `${colors.primary}0B` }]} />

          {/* Android ust sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.90)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { height: 18 }]}
            pointerEvents="none"
          />
        </>
      )}

      {/* Iki platformda da gosterilen ust highlight band */}
      <LinearGradient
        colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={st.topEdge}
        pointerEvents="none"
      />
      <View style={[st.topGlow, { backgroundColor: `${colors.primary}12` }]} />
    </View>
  );
}
