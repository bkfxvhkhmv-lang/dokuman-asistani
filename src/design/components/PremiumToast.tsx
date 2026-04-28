import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useTheme } from '../../ThemeContext';
import type { ToastConfig } from '../../hooks/useToast';

interface Props {
  config: ToastConfig | null;
  onHide: () => void;
}

const SPRING_IN = { damping: 18, stiffness: 300, mass: 0.75 };

function ToastPill({ message, tone = 'info', icon, onHide }: ToastConfig & { onHide: () => void }) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hidden = useRef(false);

  const translateY  = useSharedValue(-72);
  const opacity     = useSharedValue(0);
  const scale       = useSharedValue(0.88);
  const iconScale   = useSharedValue(0);

  const toneMap: Record<string, { bg: string; text: string; border: string }> = {
    success: { bg: Colors.success,  text: '#FFF', border: `${Colors.success}50`  },
    warning: { bg: Colors.warning,  text: '#1A1A1A', border: `${Colors.warning}50` },
    danger:  { bg: Colors.danger,   text: '#FFF', border: `${Colors.danger}50`   },
    info:    { bg: Colors.primary,  text: '#FFF', border: `${Colors.primary}50`  },
  };
  const p = toneMap[tone] ?? toneMap.info;

  const dismiss = () => {
    if (hidden.current) return;
    hidden.current = true;
    translateY.value = withTiming(-72,  { duration: 220 });
    opacity.value    = withTiming(0,    { duration: 180 }, () => runOnJS(onHide)());
  };

  useEffect(() => {
    translateY.value = withSpring(0, SPRING_IN);
    opacity.value    = withTiming(1, { duration: 160 });
    scale.value      = withSpring(1, { damping: 16, stiffness: 320 });
    // Icon bounces in with overshoot: 0 → 1.45 → 1
    iconScale.value  = withSequence(
      withSpring(1.45, { damping: 8,  stiffness: 400 }),
      withSpring(1,    { damping: 14, stiffness: 280 }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));
  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Animated.View
      style={[st.wrap, { top: insets.top + 14 }, animStyle]}
      pointerEvents="none"
    >
      <View style={[st.pill, { backgroundColor: p.bg, borderColor: p.border }]}>
        {icon ? (
          <Animated.View style={iconAnimStyle}>
            <Icon name={icon} size={14} color={p.text} />
          </Animated.View>
        ) : null}
        <Text style={[st.text, { color: p.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

export default function PremiumToast({ config, onHide }: Props) {
  return (
    <Modal
      visible={!!config}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {config && <ToastPill {...config} onHide={onHide} />}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: {
    position:   'absolute',
    left:        20,
    right:       20,
    alignItems: 'center',
  },
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    paddingHorizontal: 18,
    paddingVertical:   11,
    borderRadius:      30,
    borderWidth:       1,
    shadowColor:       '#000',
    shadowOpacity:     0.18,
    shadowRadius:      14,
    shadowOffset:      { width: 0, height: 5 },
    elevation:         10,
  },
  text: {
    fontSize:      13,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
});
