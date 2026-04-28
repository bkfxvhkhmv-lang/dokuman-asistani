import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence, withDelay,
  cancelAnimation, Easing, FadeInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';

// ── Skia glow (GPU) — optional, graceful fallback ─────────────────────────
let SkCanvas: any  = null;
let SkRect: any    = null;
let SkLinearGrad: any = null;
let skVec: any     = null;
try {
  const S      = require('@shopify/react-native-skia');
  SkCanvas     = S.Canvas;
  SkRect       = S.Rect;
  SkLinearGrad = S.LinearGradient;
  skVec        = S.vec;
} catch {}
const SKIA_OK = SkCanvas !== null;

// ── Parse rules ────────────────────────────────────────────────────────────

interface HighlightRule {
  key:    string;
  regex:  RegExp;
  color:  string;
  bg:     string;
  label:  string;
  neon:   string;  // glow color
}

const RULES: HighlightRule[] = [
  { key: 'frist',  regex: /(?:bis(?:\s+zum?)?|[Ff]rist[:\s]+|spätestens|zahlbar bis)\s+\d{1,2}\.\d{1,2}\.\d{2,4}/g, color: '#DC2626', bg: '#FEE2E2', label: 'Frist',  neon: '#EF4444' },
  { key: 'iban',   regex: /DE\d{2}[\s\d]{15,25}/g,                                                                   color: '#D97706', bg: '#FEF3C7', label: 'IBAN',   neon: '#F59E0B' },
  { key: 'amount', regex: /\b\d{1,6}[.,]\d{2}\s*€|€\s*\d{1,6}[.,]\d{2}/g,                                          color: '#16A34A', bg: '#DCFCE7', label: '€',      neon: '#22C55E' },
  { key: 'date',   regex: /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g,                                                         color: '#2563EB', bg: '#DBEAFE', label: 'Datum',  neon: '#3B82F6' },
  { key: 'email',  regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,                                     color: '#7C3AED', bg: '#EDE9FE', label: 'E-Mail', neon: '#8B5CF6' },
  { key: 'az',     regex: /Az\.?\s*:?\s*[A-Z0-9][\w/\-]{2,}/g,                                                      color: '#64748B', bg: '#F1F5F9', label: 'Az.',    neon: '#94A3B8' },
];

interface Segment {
  plain: boolean;
  text:  string;
  rule?: HighlightRule;
}

function parseSegments(text: string): Segment[] {
  if (!text) return [];
  const hits: { start: number; end: number; text: string; rule: HighlightRule }[] = [];
  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(text)) !== null)
      hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], rule });
  }
  hits.sort((a, b) => a.start - b.start);
  const noOverlap: typeof hits = [];
  let cur = 0;
  for (const h of hits) {
    if (h.start >= cur) { noOverlap.push(h); cur = h.end; }
  }
  const segs: Segment[] = [];
  let pos = 0;
  for (const h of noOverlap) {
    if (h.start > pos) segs.push({ plain: true, text: text.slice(pos, h.start) });
    segs.push({ plain: false, text: h.text, rule: h.rule });
    pos = h.end;
  }
  if (pos < text.length) segs.push({ plain: true, text: text.slice(pos) });
  return segs;
}

// ── Scan overlay — sweeps top → bottom, then fades ────────────────────────

function ScanOverlay({
  containerW,
  containerH,
  scanColor,
}: {
  containerW: number;
  containerH: number;
  scanColor:  string;
}) {
  const scanH   = useSharedValue(0);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    if (containerH <= 0) return;
    // Sweep
    scanH.value = withTiming(containerH, {
      duration: 680,
      easing:   Easing.bezier(0.4, 0, 0.8, 1),
    });
    // Fade out after sweep
    opacity.value = withDelay(
      780,
      withTiming(0, { duration: 300 }),
    );
  }, [containerH]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    height:  scanH.value,
    opacity: opacity.value,
  }));

  if (containerW === 0 || containerH === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}
    >
      <LinearGradient
        colors={['transparent', `${scanColor}14`, `${scanColor}2A`, `${scanColor}14`, 'transparent']}
        locations={[0, 0.6, 0.82, 0.94, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      />
      {/* Leading edge — thin bright line */}
      <Animated.View
        style={[
          st.scanEdge,
          { backgroundColor: scanColor },
          useAnimatedStyle(() => ({ bottom: containerH - scanH.value })),
        ]}
      />
    </Animated.View>
  );
}

// ── Skia neon glow layer — rendered after scan completes ──────────────────

function NeonGlowLayer({
  containerW,
  containerH,
  neonColors,
}: {
  containerW: number;
  containerH: number;
  neonColors: string[];
}) {
  const glowOp = useSharedValue(0);

  useEffect(() => {
    // Appear after scan finishes (680ms) then breathe
    glowOp.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.25, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(glowOp);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  if (!SKIA_OK || containerW === 0 || neonColors.length === 0) return null;

  // Draw one ambient gradient per entity color
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, animStyle]}
    >
      <SkCanvas style={StyleSheet.absoluteFill}>
        {neonColors.map((color, i) => {
          const yStart = (i / neonColors.length)       * containerH;
          const yEnd   = ((i + 1) / neonColors.length) * containerH;
          return (
            <SkRect key={i} x={0} y={yStart} width={containerW} height={yEnd - yStart}>
              <SkLinearGrad
                start={skVec(0, yStart)}
                end={skVec(containerW, yEnd)}
                colors={['transparent', `${color}12`, 'transparent']}
              />
            </SkRect>
          );
        })}
      </SkCanvas>
    </Animated.View>
  );
}

// ── Animated entity chip ──────────────────────────────────────────────────

function EntityChip({
  rule,
  count,
  index,
}: {
  rule:  HighlightRule;
  count: number;
  index: number;
}) {
  // #52 Path draw — underline draws left→right after chip appears
  const [chipW, setChipW] = React.useState(0);
  const drawSV   = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    const ENTER_DELAY = index * 110 + 500;

    // Underline draws after chip entrance animation (~350ms spring)
    if (chipW > 0) {
      drawSV.value = withDelay(
        ENTER_DELAY + 320,
        withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
      );
    }

    // Pulse breathe
    glowScale.value = withDelay(
      ENTER_DELAY + 700,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.00, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );

    return () => {
      cancelAnimation(drawSV);
      cancelAnimation(glowScale);
    };
  }, [chipW]); // eslint-disable-line react-hooks/exhaustive-deps

  const chipStyle = useAnimatedStyle(() => ({
    transform:     [{ scale: glowScale.value }],
    shadowColor:   rule.neon,
    shadowOpacity: glowScale.value * 0.55,
    shadowRadius:  glowScale.value * 8,
    shadowOffset:  { width: 0, height: 0 },
    elevation:     4,
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    width: drawSV.value * chipW,
  }));

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 110 + 500).springify().damping(18).stiffness(180)}
      onLayout={e => setChipW(e.nativeEvent.layout.width)}
      style={[
        st.chip,
        { backgroundColor: rule.bg, borderColor: `${rule.color}55` },
        chipStyle,
      ]}
    >
      <View style={[st.chipDot, { backgroundColor: rule.neon }]} />
      <Text style={[st.chipText, { color: rule.color }]}>
        {rule.label} · {count}
      </Text>

      {/* #52 Pen-draw underline */}
      <Animated.View
        pointerEvents="none"
        style={[
          st.chipUnderline,
          { backgroundColor: rule.neon },
          underlineStyle,
        ]}
      />
    </Animated.View>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface HighlightedTextViewProps {
  text?:      string | null;
  maxLength?: number;
}

export default function HighlightedTextView({
  text,
  maxLength = 1400,
}: HighlightedTextViewProps) {
  const { Colors: C } = useTheme();
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const display = text
    ? text.length > maxLength ? text.slice(0, maxLength) + '\n…' : text
    : '';

  const segments = useMemo(() => parseSegments(display), [display]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of segments)
      if (!s.plain && s.rule) c[s.rule.key] = (c[s.rule.key] || 0) + 1;
    return c;
  }, [segments]);

  const legendRules = RULES.filter(r => counts[r.key]);
  const neonColors  = legendRules.map(r => r.neon);

  if (!text) return null;

  return (
    <View>
      {/* ── Legend chips — animate in staggered ── */}
      {legendRules.length > 0 && (
        <View style={st.legend}>
          {legendRules.map((r, i) => (
            <EntityChip key={r.key} rule={r} count={counts[r.key]} index={i} />
          ))}
        </View>
      )}

      {/* ── Text + overlays ── */}
      <View
        style={{ position: 'relative' }}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          setContainerSize({ w: width, h: height });
        }}
      >
        <Text
          style={{ fontSize: 11.5, color: C.textSecondary, lineHeight: 19 }}
          selectable
        >
          {segments.map((seg, i) =>
            seg.plain ? (
              <Text key={i}>{seg.text}</Text>
            ) : (
              <Text
                key={i}
                style={{
                  color:           seg.rule?.color,
                  backgroundColor: seg.rule?.bg,
                  fontWeight:      '700',
                  borderRadius:    3,
                }}
              >
                {seg.text}
              </Text>
            )
          )}
        </Text>

        {/* Scan sweep overlay */}
        <ScanOverlay
          containerW={containerSize.w}
          containerH={containerSize.h}
          scanColor={legendRules[0]?.neon ?? C.primary}
        />

        {/* Neon glow (Skia) — breathes after scan */}
        <NeonGlowLayer
          containerW={containerSize.w}
          containerH={containerSize.h}
          neonColors={neonColors}
        />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  10,
  },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      20,
    borderWidth:       0.5,
  },
  chipDot:       { width: 6, height: 6, borderRadius: 3 },
  chipText:      { fontSize: 10, fontWeight: '700' },
  chipUnderline: { position: 'absolute', bottom: 0, left: 0, height: 1.5, borderRadius: 1 },
  scanEdge: {
    position: 'absolute',
    left:     0,
    right:    0,
    height:   1.5,
    opacity:  0.85,
  },
});
