import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors: C, S, R, Shadow } = useTheme();
  return (
    <View style={{ marginBottom: S.md, borderRadius: R.lg, padding: S.md,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textTertiary,
        letterSpacing: 0.8, marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}
