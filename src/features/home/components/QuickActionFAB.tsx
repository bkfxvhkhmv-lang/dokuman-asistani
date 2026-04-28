import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '../../../ThemeContext';
import * as Haptics from 'expo-haptics';

export interface FABAction {
  icon:    string;
  label:   string;
  color:   string;
  onPress: () => void;
}

interface Props {
  actions:      FABAction[];
  bottomOffset?: number;  // space above tab bar
}

const SPRING_CFG = { damping: 20, stiffness: 220, mass: 0.75 };

export default function QuickActionFAB({ actions, bottomOffset = 88 }: Props) {
  const { Colors } = useTheme();
  const progress   = useSharedValue(0);
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    const next = open ? 0 : 1;
    progress.value = withSpring(next, SPRING_CFG);
    setOpen(!open);
    Haptics.impactAsync(open
      ? Haptics.ImpactFeedbackStyle.Light
      : Haptics.ImpactFeedbackStyle.Medium);
  }, [open, progress]);

  const close = useCallback(() => {
    progress.value = withSpring(0, SPRING_CFG);
    setOpen(false);
  }, [progress]);

  // Main "+" button rotates to "×" when open
  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: `${interpolate(progress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg`,
    }],
  }));

  // Backdrop tint fades in
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    pointerEvents: progress.value > 0 ? 'auto' : 'none',
  }));

  return (
    <>
      {/* Blur backdrop — dismiss on tap */}
      <Animated.View style={[StyleSheet.absoluteFill, st.backdrop, backdropStyle]} pointerEvents={open ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* FAB cluster */}
      <View style={[st.cluster, { bottom: bottomOffset }]} pointerEvents="box-none">
        {/* Action buttons — rendered bottom-up so index 0 is closest to FAB */}
        {actions.map((action, idx) => (
          <ActionItem
            key={action.label}
            action={action}
            index={idx}
            total={actions.length}
            progress={progress}
            colors={Colors}
            onPress={() => { close(); action.onPress(); }}
          />
        )).reverse()}

        {/* Main FAB */}
        <TouchableOpacity
          onPress={toggle}
          activeOpacity={0.88}
          style={[st.fab, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}
        >
          <Animated.Text style={[st.fabPlus, rotateStyle]}>+</Animated.Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Individual action button ───────────────────────────────────────────────

function ActionItem({ action, index, total, progress, colors, onPress }: {
  action:   FABAction;
  index:    number;
  total:    number;
  progress: ReturnType<typeof useSharedValue<number>>;
  colors:   any;
  onPress:  () => void;
}) {
  // Stagger: higher index (farther from FAB) appears slightly later
  const staggerOffset = (total - 1 - index) * 0.07;

  const animStyle = useAnimatedStyle(() => {
    const p = Math.max(0,
      Math.min(1, (progress.value - staggerOffset) / (1 - staggerOffset || 1))
    );
    return {
      opacity:   p,
      transform: [
        { translateY: interpolate(p, [0, 1], [16, 0], Extrapolation.CLAMP) },
        { scale:      interpolate(p, [0, 1], [0.72, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[st.actionRow, animStyle]}>
      <View style={[st.labelWrap, { backgroundColor: `${colors.bg}F4` }]}>
        <Text style={[st.labelText, { color: colors.text }]}>{action.label}</Text>
      </View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        style={[st.actionBtn, { backgroundColor: action.color, shadowColor: action.color }]}
      >
        <Text style={st.actionIcon}>{action.icon}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  backdrop:   { backgroundColor: 'rgba(0,0,0,0.28)' },
  cluster:    { position: 'absolute', right: 20, alignItems: 'flex-end', gap: 14, zIndex: 200 },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.38, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  fabPlus:    { fontSize: 30, fontWeight: '200', color: '#fff', lineHeight: 34, marginTop: 2 },
  actionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelWrap:  {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  labelText:  { fontSize: 13, fontWeight: '600' },
  actionBtn:  {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  actionIcon: { fontSize: 22 },
});
