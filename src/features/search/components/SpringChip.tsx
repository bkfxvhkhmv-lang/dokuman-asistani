/**
 * Yaylanma efektli chip wrapper'i — bas-tut/birak animasyonu.
 *
 * Arama ekraninda hem schnellsuche chip'leri hem filtre modal'i
 * (typ + risiko) icinde kullanilir.
 */
import React, { useRef } from 'react';
import { Animated, TouchableOpacity, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CHIP_SPRING } from '@/features/search/components/constants';

interface Props {
  onPress: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
}

export default function SpringChip({ onPress, style, children }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.90, ...CHIP_SPRING }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, ...CHIP_SPRING }).start()}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={1}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
