import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { safeDisplayAbsender, safeDisplayTitel } from '@/utils/displaySanitizer';
import type { Dokument } from '@/store';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';

interface Props {
  dokumente: Array<Dokument & { _aehnlichScore?: number }>;
}

export function AehnlicheDocsSection({ dokumente }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  if (!dokumente.length) return null;

  const liste = dokumente.slice(0, 3);

  return (
    <SectionCard title={T('detail.section.similar')}>
      {liste.map((d, i) => (
        <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
          borderBottomWidth: i < liste.length - 1 ? 0.5 : 0, borderBottomColor: C.border }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={2} ellipsizeMode="tail">
              {safeDisplayTitel(d.titel, d.typ, d.confidence)}
            </Text>
            <Text style={{ fontSize: 11, color: C.textTertiary }}>
              {safeDisplayAbsender(d.absender, d.confidence, d.rohText)} · {d.typ}
            </Text>
            <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>
              Ähnliche Merkmale gefunden
            </Text>
          </View>
        </View>
      ))}
    </SectionCard>
  );
}
