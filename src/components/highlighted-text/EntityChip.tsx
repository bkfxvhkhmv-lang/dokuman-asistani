import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { HighlightRule } from './types';
import { highlightedTextStyles as st } from './styles';

export function EntityChip({
  rule,
  count,
  index,
}: {
  rule: HighlightRule;
  count: number;
  index: number;
}) {
  const [chipW, setChipW] = useState(0);
  const drawSV = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    const ENTER_DELAY = index * 110 + 500;

    if (chipW > 0) {
      drawSV.value = withDelay(
        ENTER_DELAY + 320,
        withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
      );
    }

    glowScale.value = withDelay(
      ENTER_DELAY + 700,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );

    return () => {
      cancelAnimation(drawSV);
      cancelAnimation(glowScale);
    };
  }, [chipW]); // eslint-disable-line react-hooks/exhaustive-deps

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    shadowColor: rule.neon,
    shadowOpacity: glowScale.value * 0.55,
    shadowRadius: glowScale.value * 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    width: drawSV.value * chipW,
  }));

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 110 + 500).springify().damping(18).stiffness(180)}
      onLayout={e => setChipW(e.nativeEvent.layout.width)}
      style={[
        st.chip,
        { backgroundColor: rule.bg, borderColor: `${rule.color}55` },
        chipStyle,
      ]}
    >
      <View style={[st.chipDot, { backgroundColor: rule.neon }]} />
      <Text style={[st.chipText, { color: rule.color }]}>
        {rule.label} · {count}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={[
          st.chipUnderline,
          { backgroundColor: rule.neon },
          underlineStyle,
        ]}
      />
    </Animated.View>
  );
}
