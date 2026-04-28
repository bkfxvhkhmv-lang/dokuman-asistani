import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Animated, { cancelAnimation, Layout,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import GlassCard from '../../../design/components/GlassCard';
import { useTheme } from '../../../ThemeContext';
import { PRIORITY_COLOR, type HotDoc } from '../../../services/PriorityService';

interface Props {
  hotDocs: HotDoc[];
  onPress: (hotDoc: HotDoc) => void;
}

export default function HotCardSection({ hotDocs, onPress }: Props) {
  const { S } = useTheme();

  if (hotDocs.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(22).stiffness(220)}
      layout={Layout.springify().damping(18).stiffness(200)}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={276}     // card 260 + gap 16
        snapToAlignment="start"
        contentContainerStyle={[st.scroll, { paddingHorizontal: S.lg }]}
        style={{ marginBottom: 14 }}
      >
        {hotDocs.map((h) => (
          <HotCard key={h.dok.id} hot={h} onPress={() => onPress(h)} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ── Individual hot card ───────────────────────────────────────────────────

function HotCard({ hot, onPress }: { hot: HotDoc; onPress: () => void }) {
  const { Colors } = useTheme();
  const accentColor = PRIORITY_COLOR[hot.priority];
  const isKritisch  = hot.priority === 'kritisch';

  // Pulse border opacity for kritisch cards
  const pulseOpacity = useSharedValue(isKritisch ? 0.9 : 0);

  useEffect(() => {
    if (!isKritisch) return;
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 900 }),
        withTiming(0.90, { duration: 900 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulseOpacity);
  }, [isKritisch, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Entry animation — slide up from below
  const entryStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(0, { damping: 20, stiffness: 200 }) }],
  }));

  return (
    <Animated.View style={[st.cardOuter, entryStyle]}>
      <Pressable onPress={onPress} android_ripple={{ color: `${accentColor}22` }}>
        <GlassCard
          accentColor={accentColor}
          intensity={32}
          borderRadius={18}
          style={[st.card, { shadowColor: accentColor }]}
        >
          {/* Pulsing border overlay for kritisch */}
          {isKritisch && (
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, st.pulseBorder, { borderColor: accentColor }, pulseStyle]}
            />
          )}

          {/* Header row: emoji + priority badge */}
          <View style={st.header}>
            <Text style={st.emoji}>{hot.emoji}</Text>
            <View style={[st.priorityBadge, { backgroundColor: `${accentColor}22` }]}>
              <Text style={[st.priorityText, { color: accentColor }]}>
                {hot.priority === 'kritisch' ? 'KRITISCH'
                 : hot.priority === 'warnung' ? 'WARNUNG'
                 : 'NEU'}
              </Text>
            </View>
          </View>

          {/* Labels */}
          <Text style={[st.label, { color: Colors.text }]} numberOfLines={1}>
            {hot.label}
          </Text>
          <Text style={[st.sublabel, { color: Colors.textSecondary }]} numberOfLines={2}>
            {hot.sublabel}
          </Text>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  scroll:       { gap: 12 },
  cardOuter:    {},
  card:         {
    width:         260,
    padding:       16,
    shadowOpacity: 0.20,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     6,
  },
  pulseBorder:  { borderRadius: 18, borderWidth: 1.5, position: 'absolute', inset: 0 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  emoji:        { fontSize: 28 },
  priorityBadge:{ borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  priorityText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  label:        { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sublabel:     { fontSize: 12, lineHeight: 17, marginBottom: 14 },
});
