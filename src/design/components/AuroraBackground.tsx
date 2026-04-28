import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';

interface AuroraBackgroundProps {
  primary: string;
  success: string;
  height?: number;
}

export default function AuroraBackground({ primary, success, height = 220 }: AuroraBackgroundProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const isAndroid = Platform.OS === 'android';
  const opacity1 = anim.interpolate({ inputRange: [0, 1], outputRange: isAndroid ? [0.14, 0.24] : [0.07, 0.15] });
  const opacity2 = anim.interpolate({ inputRange: [0, 1], outputRange: isAndroid ? [0.18, 0.10] : [0.12, 0.06] });

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height, overflow: 'hidden', zIndex: 0 }}
      pointerEvents="none"
    >
      <Animated.View style={{ position: 'absolute', top: -50, left: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: primary, opacity: opacity1 }} />
      <Animated.View style={{ position: 'absolute', top: 30, right: -70, width: 180, height: 180, borderRadius: 90, backgroundColor: success, opacity: opacity2 }} />
    </View>
  );
}
