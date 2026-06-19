import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';

interface Props {
  onPress: () => void;
}

export function ReplyDraftCard({ onPress }: Props) {
  const { Colors: C, R } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[st.card, { borderColor: C.border, backgroundColor: C.bgCard, borderRadius: R.md ?? R.lg }]}
    >
      <View style={st.row}>
        <Icon name="pencil-simple" size={20} color={C.primary} />
        <Text style={[st.title, { color: C.text }]}>Antwortentwurf</Text>
      </View>

      <Text style={[st.body, { color: C.textSecondary }]}>
        Passende Vorlage ausfüllen und kopieren.
      </Text>

      <View style={st.ctaRow}>
        <Text style={[st.cta, { color: C.primary }]}>Entwurf erstellen</Text>
        <Icon name="chevron-right" size={16} color={C.primary} />
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    fontSize: 12,
    paddingLeft: 28,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 28,
  },
  cta: {
    fontSize: 12,
    fontWeight: '500',
  },
});
