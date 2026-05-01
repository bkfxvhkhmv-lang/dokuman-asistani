import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import type { ErweiterteFeld } from '@/utils/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';

interface Props {
  felder: ErweiterteFeld[];
}

export function ExtrahierteKiSection({ felder }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  if (felder.length === 0) return null;

  return (
    <SectionCard title={T('detail.section.ki_fields')}>
      {felder.map((f, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
          borderBottomWidth: i < felder.length - 1 ? 0.5 : 0, borderBottomColor: C.border }}>
          <Text style={{ fontSize: 18, width: 28 }}>{f.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: C.textTertiary, fontWeight: '600' }}>{f.label.toUpperCase()}</Text>
            <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', marginTop: 2 }}>{f.wert}</Text>
          </View>
        </View>
      ))}
    </SectionCard>
  );
}
