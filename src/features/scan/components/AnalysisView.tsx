import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import PipelineStatus from '@/design/components/PipelineStatus';
import { styles as scanStyles } from '@/features/scan/styles';
import { ACCENT } from '@/features/scan/constants';
import { useT } from '@/hooks/useT';

interface Props {
  pageCount: number;
}

const ICON_W = 88;
const ICON_H = 112;

function DocIcon({ scanY }: { scanY: Animated.Value }) {
  return (
    <View style={{ width: ICON_W, height: ICON_H }}>
      <Svg width={ICON_W} height={ICON_H} viewBox="0 0 88 112">
        {/* Document body */}
        <Rect x="6" y="6" width="70" height="100" rx="8" fill="none" stroke="#D0D0D0" strokeWidth="3" />
        {/* Corner fold */}
        <Path d="M54 6 L76 28 L54 28 Z" fill="#E8E8E8" stroke="#D0D0D0" strokeWidth="2" />
        {/* Text lines */}
        <Line x1="18" y1="44" x2="70" y2="44" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="56" x2="70" y2="56" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="68" x2="58" y2="68" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="80" x2="64" y2="80" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
        <Line x1="18" y1="92" x2="50" y2="92" stroke="#E0E0E0" strokeWidth="3" strokeLinecap="round" />
      </Svg>

      {/* Scan line */}
      <Animated.View
        style={[
          st.scanLine,
          { transform: [{ translateY: scanY }] },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', ACCENT, '#C084FC', '#F472B6', '#FB923C', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Sparkle dots */}
      <Animated.View
        style={[
          st.sparkle,
          { transform: [{ translateY: scanY }], right: -8 },
        ]}
        pointerEvents="none"
      >
        <View style={[st.dot, { width: 5, height: 5, backgroundColor: '#FB923C' }]} />
        <View style={[st.dot, { width: 3, height: 3, backgroundColor: '#C084FC', marginTop: 4 }]} />
      </Animated.View>
    </View>
  );
}

export default function AnalysisView({ pageCount }: Props) {
  const { t: T } = useT();
  const scanY  = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [tick, setTick]   = useState(0);
  const [dots, setDots]   = useState('');

  // Fade-in on mount
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  // Scan line loop
  useEffect(() => {
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
  }, [scanY]);

  // Animated ellipsis
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(t);
  }, []);

  // Step progression
  useEffect(() => {
    const t = setInterval(() => setTick(x => Math.min(x + 1, 2)), 950);
    return () => clearInterval(t);
  }, []);

  const steps = useMemo(() => {
    const readLabel = pageCount > 1
      ? T('scan.processing.ocr_multi')
      : T('scan.processing.ocr');
    return [
      { label: T('scan.processing.saved'),   state: 'done'    as const },
      { label: readLabel,                     state: tick >= 1 ? 'done' as const : 'active' as const },
      { label: T('scan.processing.analyse'),  state: tick >= 2 ? 'done' as const : tick >= 1 ? 'active' as const : 'pending' as const },
    ];
  }, [pageCount, tick, T]);

  return (
    <SafeAreaView style={[scanStyles.fill, st.bg]}>
      <Animated.View style={[st.center, { opacity: fadeIn }]}>

        <DocIcon scanY={scanY} />

        <Text style={st.title}>
          {T('scan.processing.title')}{dots}
        </Text>

        <Text style={st.subtitle}>
          {pageCount > 1
            ? T('scan.processing.subtitle_multi').replace('{n}', String(pageCount))
            : T('scan.processing.subtitle')}
        </Text>

        <PipelineStatus steps={steps} />

      </Animated.View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bg:       { backgroundColor: '#FAFAFA' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  scanLine: {
    position:  'absolute',
    left:      6,
    right:     6,
    height:    3,
    borderRadius: 2,
    overflow:  'hidden',
  },
  sparkle:  { position: 'absolute', alignItems: 'center' },
  dot:      { borderRadius: 999 },
  title:    {
    fontSize: 19, fontWeight: '700', color: '#1A1A2E',
    letterSpacing: -0.3, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, color: '#888', textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 32,
  },
});
