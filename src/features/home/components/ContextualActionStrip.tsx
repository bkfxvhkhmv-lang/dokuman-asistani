import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../ThemeContext';
import Icon from '../../../components/Icon';
import { formatBetrag } from '../../../utils';
import type { HotDoc } from '../../../services/PriorityService';

// ── CTA — outcome-focused labels, betrag included when available ───────────

function getCtaMeta(hotDoc: HotDoc): { label: string; icon: string } {
  const betrag  = hotDoc.dok.betrag as number | null | undefined;
  const betragStr = betrag ? formatBetrag(betrag) : null;

  if (hotDoc.action === 'bezahlen') {
    const label = betragStr ? `${betragStr} begleichen` : 'Risiko senken';
    return { label, icon: 'card' };
  }

  if (hotDoc.action === 'pruefen') {
    const typ = hotDoc.dok.typ;
    if (typ === 'Bußgeld' || typ === 'Steuerbescheid') return { label: 'Einspruch prüfen', icon: 'document-text' };
    if (typ === 'Mahnung') return { label: 'Sofort reagieren', icon: 'flash' };
    return { label: 'Jetzt prüfen', icon: 'eye' };
  }

  return { label: 'Ansehen', icon: 'arrow-forward-circle' };
}

// ── Priority → visual palette ──────────────────────────────────────────────

interface StripPalette {
  bg:     string;
  border: string;
  text:   string;
  ctaBg:  string;
  ctaFg:  string;
}

function usePalette(priority: HotDoc['priority']): StripPalette {
  const { Colors: C } = useTheme();
  if (priority === 'kritisch') {
    return {
      bg:    `${C.danger}12`,
      border: C.dangerBorder,
      text:   C.danger,
      ctaBg:  C.danger,
      ctaFg:  '#fff',
    };
  }
  if (priority === 'warnung') {
    return {
      bg:    `${C.warning}14`,
      border: `${C.warning}55`,
      text:   C.warningText || C.warning,
      ctaBg:  C.warning,
      ctaFg:  '#1a1100',
    };
  }
  return {
    bg:    C.primaryLight,
    border: `${C.primary}44`,
    text:   C.primaryDark,
    ctaBg:  C.primary,
    ctaFg:  '#fff',
  };
}

// ── Component ──────────────────────────────────────────────────────────────

interface ContextualActionStripProps {
  hotDoc:    HotDoc;
  onAction:  (hotDoc: HotDoc) => void;
  onDismiss: () => void;
}

export default function ContextualActionStrip({
  hotDoc,
  onAction,
  onDismiss,
}: ContextualActionStripProps) {
  const { Colors: C } = useTheme();
  const palette = usePalette(hotDoc.priority);
  const cta     = getCtaMeta(hotDoc);

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction(hotDoc);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    // key on parent ensures re-mount (entering/exiting) when doc changes
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(160).delay(80)}
      layout={Layout.springify().damping(20).stiffness(220)}
      exiting={FadeOutDown.duration(220)}
      style={[
        st.strip,
        {
          borderColor:     palette.border,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : palette.bg,
        },
      ]}
    >
      {/* iOS glass blur */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
      )}
      {/* Tint overlay on iOS */}
      {Platform.OS === 'ios' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.bg, borderRadius: 20 }]} />
      )}

      {/* ── Left: info ── */}
      <View style={st.left}>
        <Text style={st.emoji}>{hotDoc.emoji}</Text>
        <View style={st.textBlock}>
          <Text style={[st.label, { color: palette.text }]} numberOfLines={1}>
            {hotDoc.label}
          </Text>
          <Text style={[st.sublabel, { color: C.textSecondary }]} numberOfLines={1}>
            {hotDoc.sublabel}
          </Text>
        </View>
      </View>

      {/* ── Right: CTA ── */}
      <TouchableOpacity
        onPress={handleAction}
        activeOpacity={0.85}
        style={[st.cta, { backgroundColor: palette.ctaBg }]}
      >
        <Icon name={cta.icon} size={13} color={palette.ctaFg} />
        <Text style={[st.ctaText, { color: palette.ctaFg }]}>{cta.label}</Text>
      </TouchableOpacity>

      {/* ── Dismiss × ── */}
      <TouchableOpacity onPress={handleDismiss} style={st.dismiss} hitSlop={10}>
        <Icon name="close" size={14} color={C.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  strip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    paddingVertical:   10,
    paddingLeft:       12,
    paddingRight:      8,
    borderRadius:      20,
    borderWidth:       1,
    overflow:          'hidden',
    // Shadow
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 6 },
    shadowOpacity:  0.12,
    shadowRadius:   18,
    elevation:      10,
  },
  left: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    overflow:      'hidden',
  },
  emoji:     { fontSize: 18 },
  textBlock: { flex: 1 },
  label: {
    fontSize:      12,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  sublabel: {
    fontSize:   10,
    marginTop:  1,
    fontWeight: '500',
  },
  cta: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingHorizontal: 12,
    paddingVertical:    7,
    borderRadius:      12,
  },
  ctaText: {
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },
  dismiss: {
    paddingHorizontal: 6,
    paddingVertical:   4,
  },
});
