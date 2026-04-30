import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';

interface Props {
  dokumente: Array<Dokument & { _aehnlichScore?: number }>;
}

export function AehnlicheDocsSection({ dokumente }: Props) {
  const { Colors: C } = useTheme();
  if (!dokumente.length) return null;

  const liste = dokumente.slice(0, 3);

  return (
    <SectionCard title="ÄHNLICHE DOKUMENTE">
      {liste.map((d, i) => (
        <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
          borderBottomWidth: i < liste.length - 1 ? 0.5 : 0, borderBottomColor: C.border }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={2} ellipsizeMode="tail">{d.titel}</Text>
            <Text style={{ fontSize: 11, color: C.textTertiary }}>{d.absender} · {d.typ}</Text>
          </View>
          {d._aehnlichScore != null && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.primaryLight }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.primaryDark }}>{d._aehnlichScore}★</Text>
            </View>
          )}
        </View>
      ))}
    </SectionCard>
  );
}
