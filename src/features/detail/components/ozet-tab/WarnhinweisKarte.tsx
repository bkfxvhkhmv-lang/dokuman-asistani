import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';

interface Props {
  text: string;
}

export default function WarnhinweisKarte({ text }: Props) {
  const { Colors: C, S, R } = useTheme();

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
      backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.warningText ?? C.warning, marginBottom: 4 }}>⚠ Hinweis</Text>
      <Text style={{ fontSize: 12, color: C.warningText ?? C.warning, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}
