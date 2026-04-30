import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import Icon from '@/components/Icon';

interface Props {
  C: ThemeColors;
}

export function TypingIndicator({ C }: Props) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(300),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, marginBottom: 10 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="hardware-chip-outline" size={16} color={C.primary} />
      </View>
      <View style={{
        backgroundColor: C.bgInput, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 0.5, borderColor: C.border, flexDirection: 'row', gap: 4, alignItems: 'center', height: 38,
      }}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, transform: [{ translateY: dot }] }}
          />
        ))}
      </View>
    </View>
  );
}
