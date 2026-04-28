import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import DokumentKarte from './DokumentKarte';
import type { DocStack } from '../services/CardStackService';
import type { Dokument } from '../store';

interface Props {
  stack:   DocStack;
  onPress: (dok: Dokument) => void;
  onErledigt?: (dok: Dokument) => void;
}

const SPRING_CFG  = { damping: 22, stiffness: 240, mass: 0.8 };

export default function StackedDokumentKarte({ stack, onPress, onErledigt }: Props) {
  const { Colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // shadow layers: up to 2 visible behind the lead card
  const shadowCount = Math.min(stack.docs.length - 1, 2);

  // Expansion progress (0 → 1)
  const progress = useSharedValue(0);

  const toggle = useCallback(() => {
    if (!stack.isStack) { onPress(stack.lead); return; }
    const next = expanded ? 0 : 1;
    progress.value = withSpring(next, SPRING_CFG);
    setExpanded(!expanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [expanded, stack, progress, onPress]);

  // Chevron rotation for expand indicator
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg` }],
  }));

  // Top padding to reveal shadow cards behind the lead
  const stackPeekHeight = shadowCount * 5;

  return (
    <View style={[st.outerWrap, { paddingTop: stackPeekHeight, marginHorizontal: 16, marginBottom: 10 }]}>

      {/* ── Shadow cards (peek from top-back) ─────────────────────────────── */}
      {shadowCount >= 2 && (
        <ShadowLayer
          index={2}
          totalShadows={shadowCount}
          color={Colors.bgCard}
          border={Colors.border}
        />
      )}
      {shadowCount >= 1 && (
        <ShadowLayer
          index={1}
          totalShadows={shadowCount}
          color={Colors.bgCard}
          border={Colors.border}
        />
      )}

      {/* ── Lead card ────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={stack.isStack ? 0.92 : 1}
        style={st.leadWrap}
      >
        <DokumentKarte dok={stack.lead} onPress={stack.isStack ? undefined : onPress} />

        {/* Stack badge + chevron */}
        {stack.isStack && (
          <View style={[st.badge, { backgroundColor: Colors.primary }]}>
            <Text style={st.badgeText}>{stack.docs.length}</Text>
            <Animated.Text style={[st.chevron, chevronStyle]}>›</Animated.Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Expanded stack items ─────────────────────────────────────────── */}
      {stack.isStack && (
        <ExpandedList
          docs={stack.docs.slice(1)}
          progress={progress}
          onPress={onPress}
          onErledigt={onErledigt}
          colors={Colors}
        />
      )}
    </View>
  );
}

// ── Shadow layer behind lead card ─────────────────────────────────────────

function ShadowLayer({ index, totalShadows, color, border }: {
  index:        number;
  totalShadows: number;
  color:        string;
  border:       string;
}) {
  const offset = (totalShadows - index + 1) * 5;
  return (
    <View
      pointerEvents="none"
      style={[
        st.shadowCard,
        {
          top:              0,
          left:             index * 3,
          right:            index * 3,
          height:           offset + 16,
          backgroundColor:  color,
          borderColor:      border,
          opacity:          0.9 - index * 0.22,
        },
      ]}
    />
  );
}

// ── Animated expanded list ────────────────────────────────────────────────

function ExpandedList({ docs, progress, onPress, onErledigt, colors }: {
  docs:       Dokument[];
  progress:   ReturnType<typeof useSharedValue<number>>;
  onPress:    (d: Dokument) => void;
  onErledigt?: (d: Dokument) => void;
  colors:     any;
}) {
  const containerStyle = useAnimatedStyle(() => ({
    opacity:        progress.value,
    maxHeight:      interpolate(progress.value, [0, 1], [0, docs.length * 140], Extrapolation.CLAMP),
    overflow:       'hidden',
  }));

  return (
    <Animated.View style={containerStyle}>
      <View style={[st.expandDivider, { borderColor: colors.border }]} />
      {docs.map((dok, i) => (
        <ExpandItem
          key={dok.id}
          dok={dok}
          index={i}
          progress={progress}
          onPress={onPress}
          colors={colors}
        />
      ))}
    </Animated.View>
  );
}

function ExpandItem({ dok, index, progress, onPress, colors }: {
  dok:      Dokument;
  index:    number;
  progress: ReturnType<typeof useSharedValue<number>>;
  onPress:  (d: Dokument) => void;
  colors:   any;
}) {
  const delay = index * 0.08;
  const itemStyle = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (progress.value - delay) / Math.max(1 - delay, 0.01)));
    return {
      opacity:   withTiming(p, { duration: 180 }),
      transform: [{ translateY: interpolate(p, [0, 1], [12, 0], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={itemStyle}>
      <DokumentKarte dok={dok} onPress={onPress} />
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  outerWrap:    { position: 'relative' },
  shadowCard:   {
    position:     'absolute',
    borderRadius: 18,
    borderWidth:  0.5,
    shadowColor:  '#000',
    shadowOpacity: 0.05,
    shadowRadius:  4,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     1,
  },
  leadWrap:     { position: 'relative' },
  badge: {
    position:       'absolute',
    top:            10,
    right:          10,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            2,
    borderRadius:   10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex:         10,
  },
  badgeText:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  chevron:      { color: '#fff', fontSize: 14, fontWeight: '400', lineHeight: 16 },
  expandDivider:{ borderTopWidth: 0.5, marginTop: 4, marginBottom: 4, marginHorizontal: 8 },
});
