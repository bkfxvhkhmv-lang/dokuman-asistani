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
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          {/* Solid white base so tab bar always reads clearly regardless of screen bg color */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.55)' }]} />
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
            // Solid base — slightly opaque for readability without blur
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(249,250,255,0.88)' }]} />
          )}

          {/* Android primary tint — subtle brand colour wash */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `${colors.primary}0D` }]} />

          {/* Android top gloss — fakes the iOS glass top-edge catch-light */}
          <LinearGradient
            colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { height: 22 }]}
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
