/**
 * Sayfa kalitesi gostergeleri.
 *  - QualityDot: kucuk renkli daire + sayisal etiket
 *  - QualityStrip: yatay progress bar
 *
 * Renk eşikleri (75 / 45) tek noktada — gerekirse buradan ayarla.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { SUCCESS, WARNING, DANGER } from '@/features/scan/constants';
import { batchStyles } from '@/features/scan/components/batch/styles';
import type { T } from '@/features/scan/components/batch/types';

/** 0-100 puan -> renk eslemesi. */
function colorFor(score: number): string {
  return score >= 75 ? SUCCESS : score >= 45 ? WARNING : DANGER;
}

export function QualityDot({ score, t }: { score?: number; t: T }) {
  if (typeof score !== 'number') return null;
  const color = colorFor(score);
  const label =
    score >= 75 ? t('scan.quality_good')
    : score >= 45 ? t('scan.quality_ok')
    : t('scan.quality_weak');
  return (
    <View style={batchStyles.qualityDot}>
      <View style={[batchStyles.qualityDotCircle, { backgroundColor: color }]} />
      <Text style={[batchStyles.qualityDotLabel, { color }]}>
        {Math.round(score)} · {label}
      </Text>
    </View>
  );
}

export function QualityStrip({ score }: { score?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = typeof score === 'number' ? Math.min(100, Math.max(0, score)) : 0;
  const color = colorFor(pct);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: pct / 100,
      useNativeDriver: false,
      damping: 20, stiffness: 140,
    }).start();
  }, [pct, anim]);

  return (
    <View style={batchStyles.qualityStrip}>
      <Animated.View
        style={[
          batchStyles.qualityStripFill,
          {
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}
