import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../ThemeContext';
import type { DigestResult } from '../../../services/DigestAIService';

interface Props {
  digest:    DigestResult | null;  // null = loading
  visible:   boolean;
  onDismiss: () => void;
}

// ── Typewriter hook ────────────────────────────────────────────────────────

function useTypewriter(fullText: string, active: boolean, speed = 22): string {
  const [display, setDisplay] = useState('');
  const idRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (idRef.current) clearInterval(idRef.current);
    if (!active || !fullText) { setDisplay(''); return; }
    setDisplay('');
    let i = 0;
    idRef.current = setInterval((): void => {
      i++;
      setDisplay(fullText.slice(0, i));
      if (i >= fullText.length && idRef.current) clearInterval(idRef.current);
    }, speed);
    return () => { if (idRef.current) clearInterval(idRef.current); };
  }, [fullText, active, speed]);

  return display;
}

// ── Shimmer bar ────────────────────────────────────────────────────────────

function ShimmerLine({ width, height = 12, color }: { width: DimensionValue; height?: number; color: string }) {
  const anim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 200, duration: 1100, useNativeDriver: true })
    ).start();
    return () => anim.stopAnimation();
  }, [anim]);

  return (
    <View style={[st.shimmerTrack, { width, height, borderRadius: height / 2, backgroundColor: `${color}18` }]}>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX: anim }] }}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', `${color}40`, 'rgba(0,0,0,0)'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function HomePullDigest({ digest, visible, onDismiss }: Props) {
  const { Colors, S } = useTheme();

  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  // Entry / exit animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity,    { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
      ]).start();
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Typewriter — starts only when digest arrives
  const typeText = useTypewriter(digest?.text ?? '', visible && !!digest);

  // Severity-based color
  const severityColor =
    digest?.severity === 'kritisch' ? '#EE6055' :
    digest?.severity === 'warnung'  ? '#FFB703' : Colors.primary;

  return (
    <Animated.View style={[st.wrap, { marginHorizontal: S.lg, opacity, transform: [{ translateY }] }]}>
      <View style={[st.card, { backgroundColor: `${severityColor}0E`, borderColor: `${severityColor}28` }]}>

        {/* Icon column */}
        <View style={[st.iconWrap, { backgroundColor: `${severityColor}18` }]}>
          <Text style={st.icon}>{digest?.icon ?? '🔄'}</Text>
        </View>

        {/* Content column */}
        <View style={st.content}>
          {!digest ? (
            /* Loading shimmer */
            <>
              <ShimmerLine width="90%" height={11} color={severityColor} />
              <ShimmerLine width="65%" height={9}  color={severityColor} />
            </>
          ) : (
            <>
              {/* Typewriter text */}
              <Text style={[st.text, { color: Colors.text }]}>
                {typeText}
                {typeText.length < (digest.text.length) && (
                  <Text style={{ color: severityColor }}>▌</Text>
                )}
              </Text>

              {/* Source badge */}
              <View style={st.footer}>
                <View style={[st.sourceBadge, { backgroundColor: `${severityColor}18` }]}>
                  <Text style={[st.sourceText, { color: severityColor }]}>
                    {digest.source === 'ai' ? '🤖 KI-Analyse' : '⚡ Sofort-Analyse'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Dismiss button */}
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={st.close}
        >
          <Text style={[st.closeText, { color: Colors.textTertiary }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  wrap:        { marginBottom: 10 },
  card:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                 borderRadius: 16, borderWidth: 0.5, padding: 12 },
  iconWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:        { fontSize: 18 },
  content:     { flex: 1, gap: 6 },
  text:        { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  footer:      { flexDirection: 'row', alignItems: 'center' },
  sourceBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  sourceText:  { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  close:       { paddingLeft: 4 },
  closeText:   { fontSize: 13, fontWeight: '700' },
  shimmerTrack:{ overflow: 'hidden', marginBottom: 5 },
});
