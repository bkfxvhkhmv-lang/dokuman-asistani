import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { T } from '@/design/tokens';

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors: C, S, R, Shadow } = useTheme();
  return (
    <View style={{ marginBottom: S.md, borderRadius: R.lg, padding: S.lg,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
      <Text style={{ ...T.label, color: C.textTertiary, marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}
