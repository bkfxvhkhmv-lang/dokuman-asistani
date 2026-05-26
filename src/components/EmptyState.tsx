import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import Icon from '@/components/Icon';

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
  tintKey: string;
  icon:    string;
  title:   string;
  subtitle: string;
}

function buildVariants(T: (k: string) => string): Record<EmptyVariant, VariantConfig> {
  return {
    docs: {
      tintKey:  'primary',
      icon:     'file-text',
      title:    T('home.no_docs'),
      subtitle: T('home.no_docs_sub'),
    },
    search: {
      tintKey:  'primary',
      icon:     'magnifying-glass',
      title:    T('search.empty_title'),
      subtitle: T('search.empty_sub'),
    },
    tasks: {
      tintKey:  'success',
      icon:     'check-circle',
      title:    T('detail.no_tasks'),
      subtitle: T('doc.no_action'),
    },
    calendar: {
      tintKey:  'warning',
      icon:     'calendar-blank',
      title:    T('empty.title'),
      subtitle: T('empty.sub'),
    },
    payments: {
      tintKey:  'danger',
      icon:     'currency-eur',
      title:    T('empty.title'),
      subtitle: T('empty.sub'),
    },
    folder: {
      tintKey:  'primary',
      icon:     'folder-open',
      title:    T('empty.title'),
      subtitle: T('empty.sub'),
    },
    generic: {
      tintKey:  'primary',
      icon:     'squares-four',
      title:    T('empty.title'),
      subtitle: T('empty.sub'),
    },
  };
}

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
  const { t: T } = useT();
  const VARIANTS = buildVariants(T);
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
    <Animated.View entering={FadeIn.duration(280)} style={st.container}>
      <View style={[st.iconBox, { backgroundColor: `${tint}0D`, borderColor: `${tint}1A` }]}>
        <Icon name={preset.icon} size={26} color={`${tint}CC`} />
      </View>
      <Text style={[st.title, { color: Colors.text }]}>{displayTitle}</Text>
      <Text style={[st.subtitle, { color: Colors.textSecondary }]}>{displaySubtitle}</Text>
      {action && (
        <TouchableOpacity
          style={[st.btn, { borderColor: `${tint}55` }]}
          onPress={action.onPress}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[st.btnText, { color: tint }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 56,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 16, fontWeight: '700', textAlign: 'center',
    letterSpacing: -0.2, marginBottom: 8,
  },
  subtitle: {
    fontSize: 13, textAlign: 'center', lineHeight: 19,
    letterSpacing: -0.1, marginBottom: 24, maxWidth: 280,
  },
  btn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  btnText:        { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
  compact:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 20 },
  compactDot:     { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  compactDotInner: { width: 10, height: 10, borderRadius: 5 },
  compactTitle:   { fontSize: 13, fontWeight: '600', flex: 1 },
});
