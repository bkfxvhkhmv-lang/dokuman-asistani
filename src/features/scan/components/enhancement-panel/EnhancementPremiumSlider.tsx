import React, { useRef } from 'react';
import { View, Text, PanResponder } from 'react-native';

interface PremiumSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  showCenter?: boolean;
}

export function EnhancementPremiumSlider({ label, value, min, max, onChange, showCenter = false }: PremiumSliderProps) {
  const trackWidth = useRef(0);
  const range = max - min;
  const pct = (value - min) / range;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const w = trackWidth.current;
        if (w <= 0) return;
        const raw = Math.round((x / w) * range + min);
        onChange(Math.max(min, Math.min(max, raw)));
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const w = trackWidth.current;
        if (w <= 0) return;
        const raw = Math.round((x / w) * range + min);
        onChange(Math.max(min, Math.min(max, raw)));
      },
    })
  ).current;

  const displayValue = value === 0 ? '0' : value > 0 ? `+${value}` : `${value}`;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: '#aaa', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
        <Text style={{ color: value !== 0 ? '#fff' : '#666', fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' }}>
          {displayValue}
        </Text>
      </View>

      <View
        onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
        style={{ height: 28, justifyContent: 'center' }}
        {...responder.panHandlers}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          {showCenter ? (
            <>
              {pct < 0.5 && (
                <View style={{ position: 'absolute', left: `${pct * 100}%`, width: `${(0.5 - pct) * 100}%`, height: '100%', backgroundColor: '#4FC3F7' }} />
              )}
              {pct > 0.5 && (
                <View style={{ position: 'absolute', left: '50%', width: `${(pct - 0.5) * 100}%`, height: '100%', backgroundColor: '#4FC3F7' }} />
              )}
            </>
          ) : (
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: '#4FC3F7' }} />
          )}
        </View>

        {showCenter && (
          <View style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 10, marginLeft: -1, marginTop: -5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
        )}

        <View style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          width: 20, height: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
          marginLeft: -10,
          top: '50%', marginTop: -10,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4, shadowRadius: 3,
          elevation: 4,
        }} />
      </View>
    </View>
  );
}
