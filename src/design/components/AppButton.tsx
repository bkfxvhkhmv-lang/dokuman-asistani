import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet,
  ActivityIndicator, Animated, View,
} from 'react-native';
import { useTheme } from '../../ThemeContext';
import Icon from '../../components/Icon';
import { Motion } from '../motion';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  iconRight?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: object;
  textStyle?: object;
}

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight = false,
  loading = false,
  disabled = false,
  style,
  textStyle,
}: AppButtonProps) {
  const { Colors, Shadow } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const isPrimary  = variant === 'primary';
  const isDanger   = variant === 'danger';
  const isGhost    = variant === 'ghost';
  const isDisabled = disabled || loading;

  const iconColor = isPrimary ? '#fff' : isDanger ? Colors.danger : Colors.textSecondary;
  const textColor = isPrimary ? '#fff' : isDanger ? Colors.danger : isGhost ? Colors.primary : Colors.textSecondary;

  const spring = { damping: Motion.spring.damping, stiffness: Motion.spring.stiffness, mass: Motion.spring.mass, useNativeDriver: true };
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.96, ...spring }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1.00, ...spring }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={isDisabled ? undefined : onPress}
        onPressIn={isDisabled ? undefined : onPressIn}
        onPressOut={isDisabled ? undefined : onPressOut}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          st.base,
          {
            backgroundColor: isPrimary ? Colors.primary : isGhost ? 'transparent' : Colors.bgCard,
            borderColor: isDanger ? Colors.danger : isPrimary || isGhost ? Colors.primary : Colors.border,
            borderWidth: isGhost ? 0 : 1,
            opacity: isDisabled ? 0.55 : 1,
          },
          isPrimary && Shadow.lg,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={isPrimary ? '#fff' : Colors.primary} />
        ) : (
          <View style={[st.content, iconRight && st.contentReverse]}>
            {icon && !iconRight ? (
              <Icon name={icon} size={16} color={iconColor} style={st.iconLeft} />
            ) : null}
            <Text style={[st.label, { color: textColor }, textStyle]} maxFontSizeMultiplier={1.3}>{label}</Text>
            {icon && iconRight ? (
              <Icon name={icon} size={16} color={iconColor} style={st.iconRight} />
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  base: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  contentReverse: { flexDirection: 'row-reverse' },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  iconLeft:  { marginRight: 7 },
  iconRight: { marginLeft: 7 },
});
