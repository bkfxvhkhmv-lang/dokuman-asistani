import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { ACCENT } from '@/features/scan/constants';
import {
  PROCESSING_TIMEOUT_MS,
  PROCESSING_FALLBACK_CTA,
} from '@/features/detail/constants/documentStatus';

// ── Document icon with animated scan line ─────────────────────────────────────

const ICON_W = 88;
const ICON_H = 112;

function DocIcon({ scanY }: { scanY: Animated.Value }) {
  return (
    <View style={{ width: ICON_W, height: ICON_H }}>
      <Svg width={ICON_W} height={ICON_H} viewBox="0 0 88 112">
        <Rect x="6" y="6" width="70" height="100" rx="8" fill="none" stroke="#D0D0D0" strokeWidth="3" />
        <Path d="M54 6 L76 28 L54 28 Z" fill="#E8E8E8" stroke="#D0D0D0" strokeWidth="2" />
        <Line x1="18" y1="44" x2="70" y2="44" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="56" x2="70" y2="56" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="68" x2="58" y2="68" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="80" x2="64" y2="80" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="92" x2="50" y2="92" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
      </Svg>
      <Animated.View
        style={[st.scanLine, { transform: [{ translateY: scanY }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', ACCENT, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AnalysisViewProps {
  pageCount: number;
  /** Called when user taps "Felder prüfen" or "Trotzdem weiter" after timeout */
  onContinueAnyway?: () => void;
  /** Called when user taps "Neu scannen" after timeout */
  onCancel?: () => void;
  /** Called when user taps "Erneut versuchen" after timeout */
  onRetry?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalysisView({
  pageCount,
  onContinueAnyway,
  onCancel,
  onRetry,
}: AnalysisViewProps) {
  const { Colors: C, fs } = useTheme();
  const { t: T } = useT();
  const scanY  = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState('');
  const [timedOut, setTimedOut] = useState(false);

  // Fade in
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  // Scan line loop — stops on timeout
  useEffect(() => {
    if (timedOut) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: ICON_H, duration: 1400, useNativeDriver: true }),
        Animated.delay(120),
        Animated.timing(scanY, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(200),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scanY, timedOut]);

  // Animated ellipsis
  useEffect(() => {
    if (timedOut) return;
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(t);
  }, [timedOut]);

  // 8-second safety timeout → show fallback
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), PROCESSING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={[st.root, { backgroundColor: C.bg }]}>
      <Animated.View style={[st.center, { opacity: fadeIn }]}>

        <DocIcon scanY={scanY} />

        {!timedOut ? (
          /* ── Normal processing state ── */
          <>
            <Text style={[st.title, { color: C.text, fontSize: fs(19) }]}>
              {T('scan.processing.title')}{dots}
            </Text>
            <Text style={[st.subtitle, { color: C.textTertiary, fontSize: fs(13) }]}>
              {pageCount > 1
                ? T('scan.processing.subtitle_multi', { n: pageCount })
                : T('detail.analysis.recognizing')}
            </Text>
          </>
        ) : (
          /* ── Fallback state (timeout) ── */
          <>
            <Text style={[st.title, { color: C.text, fontSize: fs(17) }]}>
              {PROCESSING_FALLBACK_CTA.title}
            </Text>
            <Text style={[st.subtitle, { color: C.textTertiary, fontSize: fs(13) }]}>
              {PROCESSING_FALLBACK_CTA.body}
            </Text>

            <View style={st.fallbackButtons}>
              <TouchableOpacity
                style={[st.fallbackBtn, st.fallbackBtnPrimary, { backgroundColor: C.primary }]}
                onPress={onContinueAnyway}
                activeOpacity={0.8}
              >
                <Text style={[st.fallbackBtnText, { color: '#fff', fontSize: fs(14) }]}>
                  {PROCESSING_FALLBACK_CTA.actions[0]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[st.fallbackBtn, { backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border }]}
                onPress={onRetry ?? onContinueAnyway}
                activeOpacity={0.8}
              >
                <Text style={[st.fallbackBtnText, { color: C.text, fontSize: fs(14) }]}>
                  {PROCESSING_FALLBACK_CTA.actions[1]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={st.fallbackBtnLink}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={[st.fallbackBtnLinkText, { color: C.textSecondary, fontSize: fs(13) }]}>
                  {PROCESSING_FALLBACK_CTA.actions[2]}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 32 },
  scanLine: {
    position: 'absolute', left: 6, right: 6, height: 3,
    borderRadius: 2, overflow: 'hidden',
  },
  title:   { fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 20 },
  fallbackButtons: { width: '100%', gap: 10, marginTop: 8 },
  fallbackBtn:     { borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  fallbackBtnPrimary: {},
  fallbackBtnText:    { fontWeight: '700' },
  fallbackBtnLink:    { alignItems: 'center', paddingVertical: 8 },
  fallbackBtnLinkText: {},
});
