/**
 * Aylik harcama bar chart — crosshair + spring tooltip + 12 bar.
 *
 * Etkilesim mantigi `useChartInteraction` hook'undan geliyor;
 * bu bilesen sadece ciziyor.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { ThemeColors } from '@/ThemeContext';
import { formatBetrag } from '@/utils';
import MonatsBalken from '@/components/budget-grafik/MonatsBalken';
import AnimatedCounter from '@/components/budget-grafik/AnimatedCounter';
import type { MonatsGruppe } from '@/components/budget-grafik/types';

interface Props {
  monatsGruppen:   MonatsGruppe[];
  maxMonatsBetrag: number;
  seciliMonat:     number;
  seciliAyBetrag:  number;
  setSeciliMonat:  (m: number) => void;

  // Hook'tan
  panHandlers:    any;
  onChartLayout:  (e: any) => void;
  tooltipStyle:   any;
  crosshairStyle: any;
  isPanning:      boolean;

  C: ThemeColors;
}

export default function MonatsChart({
  monatsGruppen, maxMonatsBetrag, seciliMonat, seciliAyBetrag, setSeciliMonat,
  panHandlers, onChartLayout, tooltipStyle, crosshairStyle, isPanning,
  C,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
        marginBottom: 16, borderWidth: 0.5, borderColor: C.border,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 12 }}>
        Monatlicher Verlauf — Tippen für Details
      </Text>

      <View
        style={{ flexDirection: 'row', height: 108, position: 'relative', marginTop: 32 }}
        onLayout={onChartLayout}
        {...panHandlers}
      >
        {/* Spring crosshair (#72) */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute', top: 0, width: 1.5, height: 88,
              backgroundColor: `${C.primary}60`,
            },
            crosshairStyle,
          ]}
        />

        {/* Spring tooltip + AnimatedCounter (#70 + #72) */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute', top: -30,
              backgroundColor: C.primary, borderRadius: 8,
              paddingHorizontal: 8, paddingVertical: 4,
              shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.40, shadowRadius: 8, elevation: 6,
            },
            tooltipStyle,
          ]}
        >
          <AnimatedCounter
            value={seciliAyBetrag}
            formatter={formatBetrag as (v: number) => string}
            style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}
          />
        </Animated.View>

        {/* 12 bar — dim efekti pan sirasinda (#71) */}
        {monatsGruppen.map(m => (
          <MonatsBalken
            key={m.monat}
            monat={m.monat}
            betrag={m.betrag}
            maxBetrag={maxMonatsBetrag}
            C={C}
            isSelected={m.monat === seciliMonat}
            isPanning={isPanning}
            onPress={() => {
              setSeciliMonat(m.monat);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        ))}
      </View>
    </View>
  );
}
