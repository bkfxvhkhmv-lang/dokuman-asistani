import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';

interface Props {
  mevcutEtiketten: string[];
}

export function EtikettenSection({ mevcutEtiketten }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  if (mevcutEtiketten.length === 0) return null;

  return (
    <SectionCard title={T('detail.section.tags')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {mevcutEtiketten.map(e => (
          <View key={e} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
            backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primary }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.primaryDark }}>🏷 {e}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}
