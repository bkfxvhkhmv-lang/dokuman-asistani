/**
 * Bagimsiz, gestur tabanli kaydirici.
 *
 * Ozellikler:
 *  - locationX'a gore deger hesabi (touch'in tam basliği yere snap)
 *  - showCenter modu: -100..+100 araliklarda 0 etrafinda iki yonlu doldurma
 *  - Genis tap area (36 px height) — kucuk dokunuslar bile kavranir
 */
import React, { useRef } from 'react';
import { View, Text, PanResponder } from 'react-native';
import { adjustStyles as st } from '@/features/scan/components/manual-adjust/styles';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** True ise 0 referans alinir; iki yonlu fill gosterilir. */
  showCenter?: boolean;
  onChange: (v: number) => void;
}

export default function Slider({ label, value, min, max, showCenter, onChange }: SliderProps) {
  const trackWidth = useRef(0);
  const range = max - min;
  const pct = (value - min) / range;
  const display = value === 0 ? '0' : value > 0 ? `+${value}` : `${value}`;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: e => {
        const w = trackWidth.current;
        if (w <= 0) return;
        const raw = Math.round((e.nativeEvent.locationX / w) * range + min);
        onChange(Math.max(min, Math.min(max, raw)));
      },
      onPanResponderMove: e => {
        const w = trackWidth.current;
        if (w <= 0) return;
        const raw = Math.round((e.nativeEvent.locationX / w) * range + min);
        onChange(Math.max(min, Math.min(max, raw)));
      },
    }),
  ).current;

  return (
    <View style={st.sliderRow}>
      <View style={st.sliderHeader}>
        <Text style={st.sliderLabel}>{label.toUpperCase()}</Text>
        <Text style={[st.sliderValue, value !== 0 && st.sliderValueActive]}>{display}</Text>
      </View>
      <View
        onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
        style={st.sliderTrackArea}
        {...responder.panHandlers}
      >
        <View style={st.sliderTrackBg}>
          {showCenter ? (
            <>
              {pct < 0.5 && (
                <View style={[st.sliderFill, { left: `${pct * 100}%`, width: `${(0.5 - pct) * 100}%` }]} />
              )}
              {pct > 0.5 && (
                <View style={[st.sliderFill, { left: '50%', width: `${(pct - 0.5) * 100}%` }]} />
              )}
            </>
          ) : (
            <View style={[st.sliderFill, { width: `${pct * 100}%` }]} />
          )}
        </View>
        {showCenter && <View style={st.sliderCenterMark} />}
        <View style={[st.sliderThumb, { left: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}
