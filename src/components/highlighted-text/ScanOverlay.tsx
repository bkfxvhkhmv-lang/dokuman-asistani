import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { highlightedTextStyles as st } from './styles';

export function ScanOverlay({
  containerW,
  containerH,
  scanColor,
}: {
  containerW: number;
  containerH: number;
  scanColor: string;
}) {
  const scanH = useSharedValue(0);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    if (containerH <= 0) return;
    scanH.value = withTiming(containerH, {
      duration: 680,
      easing: Easing.bezier(0.4, 0, 0.8, 1),
    });
    opacity.value = withDelay(
      780,
      withTiming(0, { duration: 300 }),
    );
  }, [containerH]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    height: scanH.value,
    opacity: opacity.value,
  }));
  const edgeStyle = useAnimatedStyle(() => ({ bottom: containerH - scanH.value }));

  if (containerW === 0 || containerH === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}
    >
      <LinearGradient
        colors={['transparent', `${scanColor}14`, `${scanColor}2A`, `${scanColor}14`, 'transparent']}
        locations={[0, 0.6, 0.82, 0.94, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      />
      <Animated.View
        style={[st.scanEdge, { backgroundColor: scanColor }, edgeStyle]}
      />
    </Animated.View>
  );
}
