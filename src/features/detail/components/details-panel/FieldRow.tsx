import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';

export function FieldRow({ icon, label, value, isLast = false }: {
  icon: string;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const { Colors: C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
      borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: C.border }}>
      <Text style={{ fontSize: 16, width: 26 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: C.textTertiary, fontWeight: '600' }}>{label.toUpperCase()}</Text>
        <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}
