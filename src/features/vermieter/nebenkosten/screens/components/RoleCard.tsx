import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';

export interface RoleCardProps {
  icon: string;
  titleDe: string;
  subtitleDe: string;
  onPress: () => void;
  testID?: string;
}

export function RoleCard({ icon, titleDe, subtitleDe, onPress, testID }: RoleCardProps) {
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
        <Text style={[st.iconText, { color: C.primary }]}>{icon}</Text>
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
  iconText: {
    fontSize: 22,
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
