import React, { useEffect } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../ThemeContext';

interface DocumentSurfaceProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  accentColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const SPRING = { damping: 22, stiffness: 320, mass: 0.7 };

export default function DocumentSurface({
  children, onPress, onLongPress, selected = false, accentColor, style, accessibilityLabel,
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
  const isUrgent = accent === Colors.danger || accent === Colors.warning;

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
            backgroundColor: selected ? Colors.bgCard : `${accent}${Platform.OS === 'android' ? '14' : '09'}`,
            borderColor: selected ? Colors.primary : 'transparent',
            shadowColor,
            shadowOpacity: selected ? 0.16 : isUrgent ? 0.22 : 0.07,
            shadowRadius: selected ? 20 : isUrgent ? 20 : 14,
            shadowOffset: { width: 0, height: selected ? 8 : isUrgent ? 10 : 5 },
            elevation: selected ? 6 : isUrgent ? 5 : 3,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingLeft: 20,        // extra left padding for stripe
    marginHorizontal: 16,
    marginVertical: 6,
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
