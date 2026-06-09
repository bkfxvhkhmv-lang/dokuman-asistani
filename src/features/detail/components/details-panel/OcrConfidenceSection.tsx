import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import type { OcrRisikoItem } from '@/utils/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';
import type { Dokument } from '@/store';
import { getReviewIssues, isPaymentLikeDocument } from '@/utils/documentGuards';

interface Props {
  dok: Dokument;
  confidencePct: number;
  ocrRisiken: OcrRisikoItem[];
}

// Map raw OCR risk strings to user-facing messages, deduplicated by category.
const GRUND_TO_USER: Record<string, string> = {
  'Ziffern/Buchstaben-Verwechslung (0/O, 1/I/l)': 'ocr.hint.check_numbers_letters',
  'Ungewöhnliche Groß-/Kleinschreibung':           'ocr.hint.check_spelling',
  'Ungewöhnliche Dezimalzahl':                     'ocr.hint.check_amount_decimals',
  'Betrag scheint zu klein (< 10)':                'ocr.hint.check_amount',
  'Unlesbare Zeichen':                             'ocr.hint.chars_missing',
  'Buchstabe in Zahl eingefügt':                   'ocr.hint.check_numbers',
  'IBAN-Prüfziffer stimmt nicht — OCR-Fehler?':   'ocr.hint.check_iban',
};

function toUserMessage(T: (key: string) => string, grund: string): string {
  return T(GRUND_TO_USER[grund] ?? 'ocr.hint.check_value');
}

function reviewIssueMessage(T: (key: string) => string, issue: ReturnType<typeof getReviewIssues>[number]): string {
  if (issue === 'sender') return T('ocr.hint.sender_missing');
  if (issue === 'amount') return T('ocr.hint.amount_missing');
  return T('ocr.hint.deadline_missing');
}

/** Nur bei niedriger Confidence oder Risiko-Zeilen — keine technische Punktzahl für V1. */
export function OcrConfidenceSection({ dok, confidencePct, ocrRisiken }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const reviewIssues = getReviewIssues(dok);
  const zweifel = confidencePct < 40 || ocrRisiken.length > 0 || reviewIssues.length > 0;
  if (!zweifel) return null;
  const hasAmountIssue = reviewIssues.includes('amount');
  const isPaymentDoc = isPaymentLikeDocument(dok);

  // Deduplicate by user-facing message — same issue flagged multiple times shows once.
  const issueRows = reviewIssues.map(issue => ({
    message: reviewIssueMessage(T, issue),
    risiko: issue === 'sender' ? 'mittel' : 'hoch',
  }));
  const riskRows = ocrRisiken.map(r => ({
    message: hasAmountIssue && (
      r.grund === 'Ungewöhnliche Dezimalzahl' || r.grund === 'Betrag scheint zu klein (< 10)'
    )
      ? T('ocr.hint.amount_missing')
      : toUserMessage(T, r.grund),
    risiko: r.risiko,
  })).filter(r => {
    if (isPaymentDoc) return true;
    return !/^Bitte Betrag/.test(r.message);
  });
  const unique = Array.from(
    new Map([...issueRows, ...riskRows].map(r => [r.message, r])).values(),
  );

  return (
    <SectionCard title={T('detail.section.hint')}>
      <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 19 }}>
        {T('ocr.hint.intro')}
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
