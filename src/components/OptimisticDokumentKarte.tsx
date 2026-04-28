/**
 * OptimisticDokumentKarte — placeholder card while OCR is running
 *
 * Shown in the list immediately after the user taps "Process All".
 * Renders:
 *   - Photo thumbnail (left column)
 *   - "Wird analysiert…" with animated dots
 *   - Skia data-stream lines (or Animated shimmer fallback)
 *   - Circular progress ring that fills over time
 *
 * Replaced by a real DokumentKarte via FadeIn when isOptimistic → false.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';
import type { Dokument } from '../store';

// ── Skia data-stream (optional, try-require) ──────────────────────────────

let SkCanvas:    any = null;
let SkRect:      any = null;
let SkPaint:     any = null;
let SkColor:     any = null;
try {
  const S   = require('@shopify/react-native-skia');
  SkCanvas  = S.Canvas;
  SkRect    = S.Rect;
  SkPaint   = S.Paint;
  SkColor   = S.Skia?.Color ?? null;
} catch {}

// ── Dots animation ("Analysiert...")  ─────────────────────────────────────

function AnimatedDots({ color }: { color: string }) {
  const op1 = useRef(new Animated.Value(0.3)).current;
  const op2 = useRef(new Animated.Value(0.3)).current;
  const op3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const seq = (op: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(op, { toValue: 1,   duration: 360, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.3, duration: 360, useNativeDriver: true }),
        ])
      );
    const a1 = seq(op1, 0);
    const a2 = seq(op2, 240);
    const a3 = seq(op3, 480);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [op1, op2, op3]);

  return (
    <View style={st.dots}>
      {([op1, op2, op3] as Animated.Value[]).map((op, i) => (
        <Animated.View key={i} style={[st.dot, { backgroundColor: color, opacity: op }]} />
      ))}
    </View>
  );
}

// ── Shimmer bar (Animated fallback for Skia data-stream) ─────────────────

function ShimmerBar({ color, delay = 0 }: { color: string; delay?: number }) {
  const x = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(x, { toValue: 280, duration: 1100, useNativeDriver: true }),
        Animated.timing(x, { toValue: -120, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [x, delay]);

  return (
    <View style={[st.shimmerTrack, { backgroundColor: `${color}12` }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: x }] }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', `${color}45`, 'rgba(0,0,0,0)'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ── Progress ring ──────────────────────────────────────────────────────────

function ProgressRing({ color }: { color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Simulate progress: 0 → 70% over 3s, stays there until real data arrives
    Animated.timing(width, { toValue: 42, duration: 3000, useNativeDriver: false }).start();
  }, [width]);
  return (
    <View style={[st.ringTrack, { borderColor: `${color}25` }]}>
      <Animated.View style={[st.ringFill, { width, backgroundColor: color }]} />
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  dok: Dokument;
}

export default function OptimisticDokumentKarte({ dok }: Props) {
  const { Colors } = useTheme();
  const accent = Colors.primary;

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fadeIn, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 180 }).start();
  }, [fadeIn]);

  return (
    <Animated.View style={[st.card, {
      backgroundColor: Colors.bgCard,
      borderColor:     `${accent}22`,
      opacity:          fadeIn,
      transform:        [{ scale: fadeIn.interpolate({ inputRange: [0,1], outputRange: [0.96, 1] }) }],
    }]}>

      {/* Left: thumbnail */}
      <View style={[st.thumb, { backgroundColor: `${accent}10` }]}>
        {dok.uri ? (
          <Image source={{ uri: dok.uri || undefined }} style={st.thumbImg} resizeMode="cover" />
        ) : (
          <Text style={st.thumbIcon}>📄</Text>
        )}
      </View>

      {/* Right: content */}
      <View style={st.content}>
        <View style={st.topRow}>
          <Text style={[st.label, { color: Colors.textSecondary }]}>Wird analysiert</Text>
          <AnimatedDots color={accent} />
        </View>

        {/* Data-stream shimmer bars */}
        <View style={st.bars}>
          <ShimmerBar color={accent} delay={0}   />
          <ShimmerBar color={accent} delay={340} />
          <ShimmerBar color={accent} delay={680} />
        </View>

        {/* Progress ring */}
        <ProgressRing color={accent} />
      </View>

      {/* Top-right badge */}
      <View style={[st.badge, { backgroundColor: `${accent}18` }]}>
        <Text style={[st.badgeText, { color: accent }]}>KI</Text>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  card:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 0.5,
                 marginHorizontal: 16, marginBottom: 10, padding: 12, overflow: 'hidden' },
  thumb:       { width: 56, height: 68, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  thumbImg:    { width: '100%', height: '100%' },
  thumbIcon:   { fontSize: 24 },
  content:     { flex: 1, gap: 8 },
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label:       { fontSize: 12, fontWeight: '600' },
  dots:        { flexDirection: 'row', gap: 3 },
  dot:         { width: 4, height: 4, borderRadius: 2 },
  bars:        { gap: 5 },
  shimmerTrack:{ height: 6, borderRadius: 3, overflow: 'hidden' },
  ringTrack:   { height: 4, borderRadius: 2, borderWidth: 1, overflow: 'hidden', width: 60 },
  ringFill:    { height: '100%', borderRadius: 2 },
  badge:       { position: 'absolute', top: 8, right: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
});
