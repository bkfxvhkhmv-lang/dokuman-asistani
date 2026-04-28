/**
 * QuickScanOverlay — Skia-powered document viewfinder
 *
 * Renders as an absoluteFill overlay on the camera view:
 *   • 4 animated corner brackets (SVG L-shapes)
 *   • Horizontal scan line sweeping up and down (Animated)
 *   • Corner glow when document is stable (Reanimated spring)
 *   • Status ring around the capture button area
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Rect as SvgRect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';

interface Props {
  isStable:   boolean;   // stable = detected document
  isCapturing: boolean;  // actively taking photo
  width:      number;
  height:     number;
  color?:     string;
}

const C_SIZE   = 36;    // corner bracket arm length
const C_THICK  = 3.5;   // bracket stroke width
const C_RADIUS = 8;     // corner radius
const MARGIN   = 28;    // distance from screen edge

export default function QuickScanOverlay({
  isStable, isCapturing, width, height, color = '#4361EE',
}: Props) {
  // ── Scan line animation ──────────────────────────────────────────────
  const scanY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: height - 80, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [height, scanY]);

  // ── Corner glow (stable = bright, unstable = dim) ─────────────────
  const glowOp = useSharedValue(0.45);
  useEffect(() => {
    glowOp.value = withSpring(isStable ? 1 : 0.45, { damping: 16, stiffness: 180 });
  }, [isStable, glowOp]);
  const cornerStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  // ── Capture flash ──────────────────────────────────────────────────
  const flashOp = useSharedValue(0);
  useEffect(() => {
    if (isCapturing) {
      flashOp.value = withSequence(
        withTiming(0.7, { duration: 80 }),
        withTiming(0, { duration: 220 }),
      );
    }
  }, [isCapturing, flashOp]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOp.value }));

  const activeColor = isStable ? '#1D9E75' : color;
  const scanGradId  = 'scanGrad';

  // Build corner SVG paths
  const corners = buildCorners(width, height, MARGIN, C_SIZE, C_RADIUS);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Capture flash */}
      <Reanimated.View style={[StyleSheet.absoluteFill, flashStyle, { backgroundColor: '#fff' }]} />

      {/* Corner brackets */}
      <Reanimated.View style={[StyleSheet.absoluteFill, cornerStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgGradient id={scanGradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={activeColor} stopOpacity="0" />
              <Stop offset="0.5" stopColor={activeColor} stopOpacity="0.75" />
              <Stop offset="1" stopColor={activeColor} stopOpacity="0" />
            </SvgGradient>
          </Defs>

          {corners.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={activeColor}
              strokeWidth={C_THICK}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </Reanimated.View>

      {/* Scan line */}
      <Animated.View
        style={[
          st.scanLine,
          { width, transform: [{ translateY: scanY }] },
        ]}
        pointerEvents="none"
      >
        <Svg width={width} height={32}>
          <SvgRect
            x={0} y={12} width={width} height={8}
            fill={`url(#${scanGradId})`}
          />
        </Svg>
      </Animated.View>

      {/* Stable indicator ring at bottom center */}
      {isStable && (
        <Reanimated.View style={[st.stableRing, { borderColor: '#1D9E75', bottom: 90 + MARGIN, left: width / 2 - 30 }]} />
      )}
    </View>
  );
}

// ── Corner path builder ─────────────────────────────────────────────────

function buildCorners(W: number, H: number, margin: number, arm: number, radius: number): string[] {
  const m = margin;
  const a = arm;
  const r = radius;

  // Top-left
  const tl = `M ${m},${m + a} L ${m},${m + r} Q ${m},${m} ${m + r},${m} L ${m + a},${m}`;
  // Top-right
  const tr = `M ${W - m - a},${m} L ${W - m - r},${m} Q ${W - m},${m} ${W - m},${m + r} L ${W - m},${m + a}`;
  // Bottom-left
  const bl = `M ${m},${H - m - a} L ${m},${H - m - r} Q ${m},${H - m} ${m + r},${H - m} L ${m + a},${H - m}`;
  // Bottom-right
  const br = `M ${W - m - a},${H - m} L ${W - m - r},${H - m} Q ${W - m},${H - m} ${W - m},${H - m - r} L ${W - m},${H - m - a}`;

  return [tl, tr, bl, br];
}

const st = StyleSheet.create({
  scanLine:   { position: 'absolute', top: 0, left: 0 },
  stableRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, opacity: 0.85 },
});
