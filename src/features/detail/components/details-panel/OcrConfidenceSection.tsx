import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import type { OcrRisikoItem } from '@/utils/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';

interface Props {
  confidencePct: number;
  ocrRisiken: OcrRisikoItem[];
}

/** Nur bei niedriger Confidence oder Risiko-Zeilen — keine technische Punktzahl für V1. */
export function OcrConfidenceSection({ confidencePct, ocrRisiken }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const zweifel = confidencePct < 70 || ocrRisiken.length > 0;
  if (!zweifel) return null;

  return (
    <SectionCard title={T('detail.section.hint')}>
      <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 19 }}>
        Die Texterkennung könnte ungenau sein — bitte den Text kurz prüfen.
      </Text>
      {ocrRisiken.length > 0 && (
        <View style={{ marginTop: 10, gap: 4 }}>
          {ocrRisiken.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5,
                backgroundColor: r.risiko === 'hoch' ? C.danger : C.warning }}
              />
              <Text style={{ fontSize: 11, color: C.textSecondary, flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{r.wort}</Text>: {r.grund}
              </Text>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
