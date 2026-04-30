/**
 * Aylik harcama dik cubuk — chart icindeki tek bar.
 *
 * - isSelected: true ise spring pop animasyonu yapar
 * - isPanning + !isSelected: pan suresince diger barlar dimer (#71)
 */
import React, { useEffect } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import type { ThemeColors } from '@/ThemeContext';

interface Props {
  monat:      number;
  betrag:     number;
  maxBetrag:  number;
  isSelected: boolean;
  isPanning:  boolean;
  C:          ThemeColors;
  onPress:    () => void;
}

export default function MonatsBalken({
  monat, betrag, maxBetrag, C, onPress, isSelected, isPanning,
}: Props) {
  const hoehe    = maxBetrag > 0
    ? Math.max(Math.round((betrag / maxBetrag) * 88), betrag > 0 ? 4 : 0)
    : 0;
  const kurzName = new Date(2000, monat - 1, 1).toLocaleString('de-DE', { month: 'short' });

  const scale = useSharedValue(1);
  const dimmed = isPanning && !isSelected;

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }, { scaleX: scale.value }],
    opacity:   withTiming(dimmed ? 0.28 : 1, { duration: 120 }),
  }));

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.12, { damping: 10, stiffness: 320 }, () => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      });
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', paddingHorizontal: 1 }}
    >
      <View style={{ height: 88, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
        <Animated.View
          style={[
            {
              width: '75%', height: hoehe || 2, borderRadius: 4,
              backgroundColor: isSelected
                ? C.primary
                : hoehe > 0 ? C.primary + 'aa' : C.border,
            },
            barStyle,
          ]}
        />
      </View>
      <Text
        style={{
          fontSize: 9,
          color:      isSelected ? C.primary : C.textTertiary,
          marginTop:  3,
          fontWeight: isSelected ? '700' : '400',
          opacity:    dimmed ? 0.28 : 1,
        }}
      >
        {kurzName}
      </Text>
    </TouchableOpacity>
  );
}
