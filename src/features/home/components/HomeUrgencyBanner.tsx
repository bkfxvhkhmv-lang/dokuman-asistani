import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from '@/components/Icon';
import type { Dokument } from '@/store';
import type { ThemeColors } from '@/ThemeContext';
import type { RiskPalette } from '@/theme';
import { useT } from '@/hooks/useT';
import { getDocTypeConfig } from '@/constants/docTypeConfig';
import { safeDisplayTitel } from '@/utils/displaySanitizer';

interface HomeUrgencyBannerProps {
  colors: ThemeColors;
  riskColors: RiskPalette;
  document?: Dokument | null;
  daysLeft?: number | null;
  extraCount?: number;
  onPress: () => void;
}

export default function HomeUrgencyBanner({
  colors: C,
  riskColors,
  document,
  daysLeft,
  extraCount = 0,
  onPress,
}: HomeUrgencyBannerProps) {
  const { t: T } = useT();

  if (!document || document.erledigt || daysLeft == null || daysLeft > 1) return null;

  const risk = daysLeft <= 1 ? riskColors.hoch : riskColors.mittel;
  const urgencyText =
    daysLeft === 0
      ? T('doc.today')
      : daysLeft === 1
      ? T('doc.tomorrow')
      : T('doc.due_days', { n: daysLeft });

  const cfg = getDocTypeConfig(document.typ);
  const PhIcon = cfg.PhIcon;

  return (
    <TouchableOpacity
      style={[st.card, { backgroundColor: C.bgCard, borderColor: risk.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Left accent bar */}
      <View style={[st.accentBar, { backgroundColor: risk.color }]} />

      {/* Icon box */}
      <View style={[st.iconBox, { backgroundColor: cfg.bg }]}>
        <PhIcon size={20} color={cfg.color} weight="fill" />
      </View>

      {/* Body */}
      <View style={st.body}>
        <Text style={[st.title, { color: C.text }]} numberOfLines={1}>
          {safeDisplayTitel(document.titel, document.typ, document.confidence)}
        </Text>
        <View style={st.metaRow}>
          <View style={[st.deadlinePill, { backgroundColor: risk.bg, borderColor: risk.border }]}>
            <Icon name="time" size={11} color={risk.color} />
            <Text style={[st.deadlineText, { color: risk.color }]}>{urgencyText}</Text>
          </View>
          {extraCount > 0 && (
            <Text style={[st.extra, { color: C.textSecondary }]}>
              {T('home.urgency_more', { n: extraCount })}
            </Text>
          )}
        </View>
      </View>

      {/* CTA */}
      <View style={[st.ctaBtn, { backgroundColor: risk.color }]}>
        <Text style={st.ctaText}>Prüfen</Text>
        <Icon name="chevron-forward" size={11} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 10,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 0,
    flexShrink: 0,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  extra: {
    fontSize: 11,
    fontWeight: '500',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
