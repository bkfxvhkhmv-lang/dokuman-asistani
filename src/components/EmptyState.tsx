import React, { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
  cancelAnimation, Easing, FadeIn,
} from 'react-native-reanimated';
import { useTheme, type ThemeColors } from '../ThemeContext';

// ── Breathing illustration ─────────────────────────────────────────────────

function EmptyIllustration({ tint, onTap }: { tint: string; onTap?: () => void }) {
  // Float — gentle vertical sway
  const floatY    = useSharedValue(0);
  // Ring breath — subtle scale pulse
  const ringScale = useSharedValue(1);
  // Tap bounce (#117)
  const tapScale  = useSharedValue(1);
  // Orbit dot 1 — translate on a small arc
  const orb1X     = useSharedValue(0);
  const orb1Y     = useSharedValue(0);

  useEffect(() => {
    // Float: 0 → -7 → 0 → +3 → 0 (organic, not symmetric)
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming( 2, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming( 0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );

    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.000, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );

    orb1X.value = withRepeat(
      withSequence(
        withTiming( 8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming( 5, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );

    return () => {
      cancelAnimation(floatY);
      cancelAnimation(ringScale);
      cancelAnimation(orb1X);
      cancelAnimation(orb1Y);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // #117 tap bounce handler
  const handleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    tapScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1.12, { damping: 8, stiffness: 300 }),
      withSpring(1.0,  { damping: 12, stiffness: 220 }),
    );
    onTap?.();
  }, [onTap]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapStyle    = useAnimatedStyle(() => ({ transform: [{ scale: tapScale.value }] }));
  const floatStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));
  const ringStyle   = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }] }));
  const orb1Style   = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  return (
    <TouchableOpacity onPress={handleTap} activeOpacity={1}>
    <Animated.View style={[floatStyle, tapStyle, il.wrap]}>
      {/* Outer ring — breathes */}
      <Animated.View style={[il.ring, { borderColor: `${tint}1A` }, ringStyle]}>
        {/* Inner circle */}
        <View style={[il.inner, { backgroundColor: `${tint}0E`, borderColor: `${tint}20` }]}>
          {/* Document shape */}
          <View style={[il.doc, { backgroundColor: `${tint}18`, borderColor: `${tint}40` }]}>
            <View style={[il.line, { backgroundColor: `${tint}66`, width: 28 }]} />
            <View style={[il.line, { backgroundColor: `${tint}44`, width: 20, marginTop: 4 }]} />
            <View style={[il.line, { backgroundColor: `${tint}44`, width: 24, marginTop: 4 }]} />
            <View style={[il.corner, { borderRightColor: tint, borderBottomColor: tint }]} />
          </View>
        </View>
      </Animated.View>

      {/* Orbiting dots */}
      <Animated.View style={[il.orbitDot,  { backgroundColor: `${tint}55` }, orb1Style]} />
      <View         style={[il.orbitDot2, { backgroundColor: `${tint}30` }]} />
    </Animated.View>
    </TouchableOpacity>
  );
}

// ── Variant configs ────────────────────────────────────────────────────────

export type EmptyVariant =
  | 'docs'
  | 'search'
  | 'tasks'
  | 'calendar'
  | 'payments'
  | 'folder'
  | 'generic';

interface VariantConfig {
  tintKey:    string;
  title:      string;
  subtitle:   string;
  assistant:  string;   // voice of the assistant — personal, contextual
}

const VARIANTS: Record<EmptyVariant, VariantConfig> = {
  docs: {
    tintKey:   'primary',
    title:     'Noch keine Dokumente',
    subtitle:  'Scanne dein erstes Dokument und ich analysiere es sofort für dich.',
    assistant: 'Tipp: Du kannst auch ein Beispieldokument testen — tippe einfach auf „Demo starten".',
  },
  search: {
    tintKey:   'primary',
    title:     'Keine Treffer',
    subtitle:  'Versuche andere Begriffe oder aktiviere die semantische Suche.',
    assistant: 'Ich verstehe auch Fragen wie „Welche Rechnungen sind diesen Monat überfällig?"',
  },
  tasks: {
    tintKey:   'success',
    title:     'Keine offenen Aufgaben',
    subtitle:  'Alles erledigt — ein gutes Gefühl.',
    assistant: 'Wenn neue Dokumente eintreffen, erstelle ich automatisch Aufgaben daraus.',
  },
  calendar: {
    tintKey:   'warning',
    title:     'Keine Fristen in Sicht',
    subtitle:  'Dokumente mit Fristdatum erscheinen hier automatisch.',
    assistant: 'Ich behalte deine Fristen im Auge und erinnere dich rechtzeitig.',
  },
  payments: {
    tintKey:   'danger',
    title:     'Keine Zahlungsdokumente',
    subtitle:  'Rechnungen, Mahnungen und Bußgelder erscheinen hier.',
    assistant: 'Sobald du ein Zahlungsdokument scannst, berechne ich den Betrag automatisch.',
  },
  folder: {
    tintKey:   'primary',
    title:     'Ordner ist leer',
    subtitle:  'Verschiebe Dokumente hierher, um sie zu organisieren.',
    assistant: 'Ich kann Dokumente auch automatisch kategorisieren — probiere es aus.',
  },
  generic: {
    tintKey:   'primary',
    title:     'Nichts zu sehen',
    subtitle:  'Hier erscheinen Einträge, sobald Daten vorliegen.',
    assistant: 'Ich bin bereit — füge Daten hinzu und ich zeige dir alles.',
  },
};

// ── Component ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  variant?:  EmptyVariant;
  title?:    string;
  subtitle?: string;
  action?:   { label: string; onPress: () => void };
  compact?:  boolean;
}

export default function EmptyState({
  variant = 'generic',
  title,
  subtitle,
  action,
  compact = false,
}: EmptyStateProps) {
  const { Colors } = useTheme();
  const preset = VARIANTS[variant];
  const tint   = (Colors[preset.tintKey as keyof ThemeColors] as string | undefined) ?? Colors.primary;

  const displayTitle    = title    ?? preset.title;
  const displaySubtitle = subtitle ?? preset.subtitle;

  if (compact) {
    return (
      <View style={st.compact}>
        <View style={[st.compactDot, { backgroundColor: `${tint}20`, borderColor: `${tint}44` }]}>
          <View style={[st.compactDotInner, { backgroundColor: tint }]} />
        </View>
        <Text style={[st.compactTitle, { color: Colors.textSecondary }]}>{displayTitle}</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(320)} style={st.container}>
      <EmptyIllustration tint={tint} onTap={action?.onPress} />

      <Text style={[st.title, { color: Colors.text }]}>{displayTitle}</Text>
      <Text style={[st.subtitle, { color: Colors.textSecondary }]}>{displaySubtitle}</Text>

      {/* Assistant voice bubble */}
      <View style={[st.assistantBubble, { backgroundColor: `${tint}0C`, borderColor: `${tint}28` }]}>
        <View style={[st.assistantDot, { backgroundColor: tint }]} />
        <Text style={[st.assistantText, { color: Colors.textSecondary }]}>
          {preset.assistant}
        </Text>
      </View>

      {action && (
        <TouchableOpacity
          style={[st.btn, { backgroundColor: tint }]}
          onPress={action.onPress}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={st.btnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Illustration styles ────────────────────────────────────────��──────────

const il = StyleSheet.create({
  wrap:      { alignItems: 'center', marginBottom: 28 },
  ring:      { width: 128, height: 128, borderRadius: 64, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inner:     { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doc:       { width: 44, height: 54, borderRadius: 8, borderWidth: 1, padding: 8, alignItems: 'flex-start', overflow: 'hidden' },
  line:      { height: 3, borderRadius: 2 },
  corner:    { position: 'absolute', bottom: 7, right: 7, width: 8, height: 8, borderRightWidth: 2, borderBottomWidth: 2, borderRadius: 1 },
  orbitDot:  { position: 'absolute', width: 8, height: 8, borderRadius: 4, top: 14, right: 14 },
  orbitDot2: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, bottom: 18, left: 18 },
});

// ── Component styles ──────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, paddingVertical: 48,
  },
  title: {
    fontSize: 17, fontWeight: '700', textAlign: 'center',
    letterSpacing: -0.3, marginBottom: 8,
  },
  subtitle: {
    fontSize: 13, textAlign: 'center', lineHeight: 20,
    letterSpacing: -0.1, marginBottom: 16,
  },
  assistantBubble: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginBottom: 24, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  assistantDot:  { width: 6, height: 6, borderRadius: 3, marginTop: 4, flexShrink: 0 },
  assistantText: { flex: 1, fontSize: 12, lineHeight: 18, fontStyle: 'italic', letterSpacing: -0.1 },
  btn:           { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999 },
  btnText:       { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  compact:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 20 },
  compactDot:    { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  compactDotInner: { width: 10, height: 10, borderRadius: 5 },
  compactTitle:  { fontSize: 13, fontWeight: '600', flex: 1 },
});
