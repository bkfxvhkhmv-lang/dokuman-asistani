import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { IconWeight } from 'phosphor-react-native';
import { useTheme } from '@/ThemeContext';

export interface RoleCardProps {
  PhIcon: React.ComponentType<{ size?: number; color?: string; weight?: IconWeight }>;
  titleDe: string;
  subtitleDe: string;
  onPress: () => void;
  testID?: string;
}

export function RoleCard({ PhIcon, titleDe, subtitleDe, onPress, testID }: RoleCardProps) {
  const { Colors: C, R } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        st.card,
        {
          backgroundColor: C.bgCard,
          borderColor: C.borderLight,
          borderRadius: R.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={titleDe}
    >
      <View style={[st.iconCircle, { backgroundColor: C.primaryLight }]}>
        <PhIcon size={24} color={C.primary} weight="regular" />
      </View>
      <View style={st.body}>
        <Text style={[st.title, { color: C.text }]}>{titleDe}</Text>
        <Text style={[st.subtitle, { color: C.textSecondary }]}>{subtitleDe}</Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
