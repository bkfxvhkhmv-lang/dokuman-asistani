import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';

type Props = {
  text: string;
  /** Kurz-Fassung (Value-Moment) */
  title?: string;
  maxLines?: number;
};

export default function SummaryCard({ text, title = 'Kurzfassung', maxLines = 3 }: Props) {
  const { Colors: C, S, R } = useTheme();
  const t = text.trim();
  if (!t) return null;

  return (
    <View
      style={{
        marginHorizontal: S.md,
        marginBottom: S.md,
        paddingHorizontal: S.lg,
        paddingVertical: S.md + 4,
        borderRadius: R.lg,
        backgroundColor: C.bgCard,
        borderWidth: 1,
        borderColor: C.borderLight,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.6, marginBottom: 6 }}>
        {title.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: C.textSecondary }} numberOfLines={maxLines}>
        {t}
      </Text>
    </View>
  );
}
