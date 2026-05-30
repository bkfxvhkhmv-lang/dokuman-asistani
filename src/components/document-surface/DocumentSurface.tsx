import React, { useEffect } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/ThemeContext';

interface DocumentSurfaceProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  accentColor?: string;
  urgent?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const SPRING = { damping: 22, stiffness: 320, mass: 0.7 };

export default function DocumentSurface({
  children, onPress, onLongPress, selected = false, accentColor, urgent = false, style, accessibilityLabel,
}: DocumentSurfaceProps) {
  const { Colors } = useTheme();
  const scale = useSharedValue(1);
  const stripeAnim = useSharedValue(0);

  useEffect(() => {
    stripeAnim.value = withSpring(1, { damping: 18, stiffness: 240 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const stripeStyle = useAnimatedStyle(() => {
    const s = stripeAnim.value;
    return {
      transform: [
        { translateX: -1.5 * (1 - s) },
        { scaleX: s },
      ],
    };
  });

  const handlePressIn  = () => {
    scale.value = withSpring(selected ? 0.993 : 0.978, SPRING);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const handlePressOut = () => { scale.value = withSpring(1, SPRING); };

  const accent = accentColor || Colors.border;
  const shadowColor = selected ? Colors.primary : accent;
  const isUrgent = urgent;

  return (
    <Animated.View style={[animStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
        accessibilityHint={onLongPress ? 'Gedrückt halten zum Auswählen' : undefined}
        style={[
          st.card,
          {
            backgroundColor: Colors.bgCard,
            borderColor: selected
              ? Colors.primary
              : isUrgent
              ? `${accent}28`
              : Colors.borderLight,
            borderWidth: selected ? 1.5 : isUrgent ? 1 : 1,
            shadowColor,
            shadowOpacity: selected ? 0.16 : isUrgent ? 0.10 : 0.05,
            shadowRadius: selected ? 16 : isUrgent ? 14 : 10,
            shadowOffset: { width: 0, height: selected ? 6 : isUrgent ? 4 : 3 },
            elevation: selected ? 5 : isUrgent ? 3 : 2,
          },
          selected && st.selected,
        ]}
      >
        {/* Left accent stripe — entrance reveal */}
        <Animated.View style={[st.leftStripe, { backgroundColor: accent }, stripeStyle]} />
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingLeft: 18,        // extra left padding for stripe
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selected: { borderWidth: 1.5 },
  leftStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
});
