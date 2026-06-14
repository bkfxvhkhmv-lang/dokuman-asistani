import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import type { InstitutionSuggestion } from '@/core/intelligence/InstitutionBehaviorModel';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';

interface Props {
  institution: InstitutionSuggestion;
}

export function AbsenderProfilSection({ institution }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  if (institution.totalDocs <= 0) return null;
  const confidenceLabel = institution.confidence === 'high'
    ? 'Verifiziert'
    : institution.confidence === 'medium'
      ? 'Einige Angaben sollten geprüft werden'
      : 'Prüfung empfohlen';

  return (
    <SectionCard title={T('detail.section.sender')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
          backgroundColor: institution.confidence === 'high'   ? '#22C55E22' :
                           institution.confidence === 'medium' ? '#F59E0B22' : '#6B728022',
          borderWidth: 0.5,
          borderColor: institution.confidence === 'high'   ? '#22C55E' :
                        institution.confidence === 'medium' ? '#F59E0B' : '#6B7280',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700',
            color: institution.confidence === 'high'   ? '#22C55E' :
                   institution.confidence === 'medium' ? '#F59E0B' : C.textSecondary }}>
            {confidenceLabel}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: C.textTertiary }}>
          {institution.totalDocs} {institution.totalDocs === 1 ? 'Dokument' : 'Dokumente'} bekannt
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        {institution.likelyTyp && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>Häufigster Typ</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{institution.likelyTyp}</Text>
          </View>
        )}
        {institution.avgFristText && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>Ø Frist</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{institution.avgFristText}</Text>
          </View>
        )}
        {institution.avgBetragText && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>Ø Betrag</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{institution.avgBetragText}</Text>
          </View>
        )}
        {institution.likelyRisiko && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>Typ. Risiko</Text>
            <Text style={{ fontSize: 12, fontWeight: '700',
              color: institution.likelyRisiko === 'hoch'   ? C.danger :
                     institution.likelyRisiko === 'mittel' ? C.warning : '#22C55E' }}>
              {institution.likelyRisiko === 'hoch'   ? 'Hoch' :
               institution.likelyRisiko === 'mittel' ? 'Mittel' : 'Niedrig'}
            </Text>
          </View>
        )}
      </View>
    </SectionCard>
  );
}
