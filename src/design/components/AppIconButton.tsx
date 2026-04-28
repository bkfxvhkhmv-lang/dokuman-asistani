import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View, ViewStyle, Animated } from 'react-native';
import Icon from '../../components/Icon';
import { useTheme } from '../../ThemeContext';
import { HIT_SLOP } from '../../theme';

interface AppIconButtonProps {
  name: string;
  onPress?: () => void;
  active?: boolean;
  size?: number;
  style?: ViewStyle;
  badge?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export default function AppIconButton({
  name,
  onPress,
  active = false,
  size = 18,
  style,
  badge = false,
  accessibilityLabel,
  disabled = false,
}: AppIconButtonProps) {
  const { Colors, hitSlopScale } = useTheme();
  const scaledHitSlop = {
    top:    Math.round(HIT_SLOP.top    * hitSlopScale),
    bottom: Math.round(HIT_SLOP.bottom * hitSlopScale),
    left:   Math.round(HIT_SLOP.left   * hitSlopScale),
    right:  Math.round(HIT_SLOP.right  * hitSlopScale),
  };
  const scale = useRef(new Animated.Value(1)).current;
  const prevActive = useRef(active);

  // Bounce when active state toggles
  useEffect(() => {
    if (prevActive.current === active) return;
    prevActive.current = active;
    Animated.sequence([
      Animated.spring(scale, { toValue: active ? 0.82 : 1.12, damping: 14, stiffness: 400, mass: 0.5, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,                     damping: 12, stiffness: 280, mass: 0.6, useNativeDriver: true }),
    ]).start();
  }, [active]);

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.88, damping: 14, stiffness: 400, mass: 0.5, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    damping: 12, stiffness: 280, mass: 0.6, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        style={[
          st.base,
          {
            backgroundColor: active ? Colors.primary    : Colors.bgCard,
            borderColor:      active ? Colors.primaryDark : Colors.border,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
        activeOpacity={0.9}
        hitSlop={scaledHitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? name.replace(/-/g, ' ')}
        accessibilityState={{ selected: active, disabled }}
      >
        <Icon name={name} size={size} color={active ? '#fff' : Colors.textSecondary} />
        {badge && (
          <View style={[st.badge, { backgroundColor: active ? '#fff' : Colors.primary }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  base: {
    width: 40, height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6, right: 6,
    width: 8, height: 8,
    borderRadius: 4,
  },
});
