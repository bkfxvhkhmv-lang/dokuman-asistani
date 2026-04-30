/**
 * Aktif sekmenin altinda gezinen pill — yumusak halo + parlak iç çekirdek.
 *
 * X koordinati `useSharedValue` ile parent tarafindan animate edilir;
 * sekme degisimi yumusak spring ile yeni merkeze kayar.
 */
import React from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { tabStyles as st } from '@/navigation/tab-bar/styles';
import { AURA_W, AURA_CORE } from '@/navigation/tab-bar/constants';

interface Props {
  x: SharedValue<number>;
  primaryColor: string;
}

export default function AuraGlow({ x, primaryColor }: Props) {
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - AURA_W / 2 }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - AURA_CORE / 2 }],
  }));

  return (
    <>
      {/* Outer soft halo */}
      <Animated.View
        pointerEvents="none"
        style={[st.auraHalo, { backgroundColor: `${primaryColor}16` }, haloStyle]}
      />
      {/* Inner bright core — iOS'da shadow, Android'de elevation kullanir */}
      <Animated.View
        pointerEvents="none"
        style={[
          st.auraCore,
          {
            backgroundColor: `${primaryColor}26`,
            shadowColor:     primaryColor,
            elevation:       6,
          },
          coreStyle,
        ]}
      />
    </>
  );
}
