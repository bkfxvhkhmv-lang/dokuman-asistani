import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import type { OcrRisikoItem } from '@/utils/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';

interface Props {
  confidencePct: number;
  ocrRisiken: OcrRisikoItem[];
}

// Map raw OCR risk strings to user-facing messages, deduplicated by category.
const GRUND_TO_USER: Record<string, string> = {
  'Ziffern/Buchstaben-Verwechslung (0/O, 1/I/l)': 'Bitte Zahlen und Buchstaben prüfen.',
  'Ungewöhnliche Groß-/Kleinschreibung':           'Bitte Schreibweise prüfen.',
  'Ungewöhnliche Dezimalzahl':                     'Bitte Betrag und Kommastellen prüfen.',
  'Betrag scheint zu klein (< 10)':                'Bitte Betrag prüfen.',
  'Unlesbare Zeichen':                             'Einige Zeichen konnten nicht erkannt werden.',
  'Buchstabe in Zahl eingefügt':                   'Bitte Zahlen prüfen.',
  'IBAN-Prüfziffer stimmt nicht — OCR-Fehler?':   'Bitte IBAN prüfen.',
};

function toUserMessage(grund: string): string {
  return GRUND_TO_USER[grund] ?? 'Bitte diesen Wert prüfen.';
}

/** Nur bei niedriger Confidence oder Risiko-Zeilen — keine technische Punktzahl für V1. */
export function OcrConfidenceSection({ confidencePct, ocrRisiken }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const zweifel = confidencePct < 70 || ocrRisiken.length > 0;
  if (!zweifel) return null;

  // Deduplicate by user-facing message — same issue flagged multiple times shows once.
  const unique = Array.from(
    new Map(ocrRisiken.map(r => [toUserMessage(r.grund), r])).values(),
  );

  return (
    <SectionCard title={T('detail.section.hint')}>
      <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 19 }}>
        Einige Angaben konnten nicht sicher erkannt werden. Bitte kurz prüfen.
      </Text>
      {unique.length > 0 && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {unique.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 4,
                backgroundColor: r.risiko === 'hoch' ? C.danger : C.warning }}
              />
              <Text style={{ fontSize: 12, color: C.textSecondary, flex: 1, lineHeight: 18 }}>
                {toUserMessage(r.grund)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
