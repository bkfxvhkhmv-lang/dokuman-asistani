import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';
import Icon from '../../components/Icon';
import { useTheme } from '../../ThemeContext';
import { UISoundService } from '../../services/UISoundService';

type Tone = 'default' | 'success' | 'warning' | 'danger';

interface AppToastProps {
  message:   string;
  icon?:     string;
  tone?:     Tone;
  onPress?:  () => void;
  floating?: boolean;
  style?:    ViewStyle;
}

export default function AppToast({
  message,
  icon = 'information-circle-outline',
  tone = 'default',
  onPress,
  floating = false,
  style,
}: AppToastProps) {
  const { Colors } = useTheme();

  // Spring bounce on mount + micro-sound
  const iconScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(iconScale, {
      toValue:         1,
      damping:         10,
      stiffness:       280,
      mass:            0.6,
      useNativeDriver: true,
    }).start();
    // Tone matched to toast type
    if (tone === 'success') UISoundService.success();
    else                    UISoundService.tick();
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const toneMap: Record<Tone, { bg: string; border: string; fg: string; dot: string }> = {
    default: { bg: Colors.primaryLight, border: `${Colors.primary}44`,  fg: Colors.primaryDark,         dot: Colors.primary  },
    success: { bg: Colors.successLight, border: `${Colors.success}44`,  fg: Colors.success,              dot: Colors.success  },
    warning: { bg: Colors.warningLight, border: `${Colors.warning}44`,  fg: Colors.warningText || Colors.warning, dot: Colors.warning  },
    danger:  { bg: Colors.dangerLight,  border: Colors.dangerBorder,    fg: Colors.danger,               dot: Colors.danger   },
  };

  const palette = toneMap[tone];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      style={[
        st.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        floating && { ...st.floating, shadowColor: palette.dot },
        style,
      ]}
    >
      <View style={[st.dot, { backgroundColor: palette.dot }]} />

      {/* Bouncing icon */}
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Icon name={icon} size={13} color={palette.fg} />
      </Animated.View>

      <Text style={[st.message, { color: palette.fg }]} maxFontSizeMultiplier={1.2}>{message}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderRadius:   16,
    borderWidth:    1,
  },
  floating: {
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius:  20,
    elevation:     20,
  },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  message: { fontSize: 11, fontWeight: '600' },
});
