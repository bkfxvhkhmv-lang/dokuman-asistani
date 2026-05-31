import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import type { OcrRisikoItem } from '@/utils/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';
import type { Dokument } from '@/store';
import { getReviewIssues } from '@/utils/documentGuards';

interface Props {
  dok: Dokument;
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

function reviewIssueMessage(issue: ReturnType<typeof getReviewIssues>[number]): string {
  if (issue === 'sender') return 'Absender bitte prüfen oder ergänzen.';
  if (issue === 'amount') return 'Betrag bitte prüfen oder ergänzen.';
  return 'Frist bitte prüfen oder ergänzen.';
}

/** Nur bei niedriger Confidence oder Risiko-Zeilen — keine technische Punktzahl für V1. */
export function OcrConfidenceSection({ dok, confidencePct, ocrRisiken }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const reviewIssues = getReviewIssues(dok);
  const zweifel = confidencePct < 40 || ocrRisiken.length > 0 || reviewIssues.length > 0;
  if (!zweifel) return null;
  const hasAmountIssue = reviewIssues.includes('amount');

  // Deduplicate by user-facing message — same issue flagged multiple times shows once.
  const issueRows = reviewIssues.map(issue => ({
    message: reviewIssueMessage(issue),
    risiko: issue === 'sender' ? 'mittel' : 'hoch',
  }));
  const riskRows = ocrRisiken.map(r => ({
    message: hasAmountIssue && (
      r.grund === 'Ungewöhnliche Dezimalzahl' || r.grund === 'Betrag scheint zu klein (< 10)'
    )
      ? 'Betrag bitte prüfen oder ergänzen.'
      : toUserMessage(r.grund),
    risiko: r.risiko,
  }));
  const unique = Array.from(
    new Map([...issueRows, ...riskRows].map(r => [r.message, r])).values(),
  );

  return (
    <SectionCard title={T('detail.section.hint')}>
      <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 19 }}>
        Einige Angaben sollten kurz geprüft werden.
      </Text>
      {unique.length > 0 && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {unique.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 4,
                backgroundColor: r.risiko === 'hoch' ? C.danger : C.warning }}
              />
              <Text style={{ fontSize: 12, color: C.textSecondary, flex: 1, lineHeight: 18 }}>
                {r.message}
              </Text>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
