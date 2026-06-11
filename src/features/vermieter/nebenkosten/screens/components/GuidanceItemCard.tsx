import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { NkGuidanceItem } from '@/features/vermieter/nebenkosten/guidance';

export interface GuidanceItemCardProps {
  item: NkGuidanceItem;
}

export function GuidanceItemCard({ item }: GuidanceItemCardProps) {
  const { Colors: C, R } = useTheme();

  const severityMeta =
    item.severity === 'error'
      ? { color: C.danger, bg: C.dangerLight, label: 'Fehler' }
      : item.severity === 'warning'
        ? { color: C.warning, bg: C.warningLight, label: 'Hinweis' }
        : { color: C.textTertiary, bg: C.bgInput, label: 'Info' };

  return (
    <View
      style={[
        st.card,
        {
          backgroundColor: C.bgCard,
          borderColor: C.borderLight,
          borderRadius: R.md,
          borderLeftWidth: 4,
          borderLeftColor: severityMeta.color,
        },
      ]}
    >
      <View style={[st.badge, { backgroundColor: severityMeta.bg }]}>
        <Text style={[st.badgeText, { color: severityMeta.color }]}>
          {severityMeta.label}
        </Text>
      </View>
      <Text style={[st.message, { color: C.text }]}>{item.messageDe}</Text>
      {item.nextStepsDe.length > 0 && (
        <View style={st.steps}>
          {item.nextStepsDe.map((step, idx) => (
            <Text key={idx} style={[st.step, { color: C.textSecondary }]}>
              • {step}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  steps: {
    marginTop: 10,
    gap: 4,
  },
  step: {
    fontSize: 13,
    lineHeight: 18,
  },
});
