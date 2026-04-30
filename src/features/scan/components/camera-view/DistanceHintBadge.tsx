import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import type { DistanceHint } from '@/hooks/useScanner';
import { useScanI18n } from '@/hooks/useScanI18n';
import { DISTANCE_HINT_CONFIG } from '@/features/scan/components/camera-view/constants';

interface Props {
  hint: DistanceHint;
}

export default function DistanceHintBadge({ hint }: Props) {
  const { t } = useScanI18n();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hint) {
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [hint, opacity]);

  const cfg = hint ? DISTANCE_HINT_CONFIG[hint] : null;

  return (
    <Animated.View style={[st.wrap, { opacity }]} pointerEvents="none">
      {cfg && (
        <View style={[st.pill, { borderColor: cfg.color }]}>
          <Text style={[st.icon, { color: cfg.color }]}>{cfg.icon}</Text>
          <Text style={[st.label, { color: cfg.color }]}>{t(cfg.key)}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap:  { position: 'absolute', bottom: -36, left: 0, right: 0, alignItems: 'center' },
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.55)' },
  icon:  { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});
