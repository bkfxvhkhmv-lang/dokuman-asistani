import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import AppCard from './AppCard';

interface AppStatCardProps {
  value: string | number;
  label: string;
  color: string;
  borderTopColor?: string;
  backgroundColor?: string;
  textColor?: string;
  shadowStyle?: object;
  style?: ViewStyle;
}

export default function AppStatCard({
  value,
  label,
  color,
  borderTopColor,
  backgroundColor,
  textColor,
  shadowStyle,
  style,
}: AppStatCardProps) {
  return (
    <AppCard
      style={[
        st.card,
        shadowStyle as ViewStyle,
        {
          backgroundColor,
          borderTopColor: borderTopColor || color,
        },
        style,
      ] as unknown as ViewStyle}
      radius={14}
      padding={12}
    >
      <Text style={[st.value, { color }]}>{value}</Text>
      <Text style={[st.label, { color: textColor }]}>{label}</Text>
    </AppCard>
  );
}

const st = StyleSheet.create({
  card:  { flex: 1, alignItems: 'center', borderTopWidth: 3 },
  value: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 10, marginTop: 2, fontWeight: '500' },
});
