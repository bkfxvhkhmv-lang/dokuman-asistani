import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { WarningCircle, Money, PencilSimple, CalendarBlank, FileText, File, Clock, CheckCircle } from 'phosphor-react-native';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import DocumentSurface from '@/components/document-surface/DocumentSurface';
import type { Dokument } from '@/store';
import { excerptForDocumentListCard } from '@/utils/listCardSummary';
import { useT } from '@/hooks/useT';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTageText(frist: string | null | undefined, T: (key: string, vars?: Record<string, string | number>) => string): string | null {
  if (!frist) return null;
  const diff = Math.ceil((new Date(frist).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return T('doc.overdue');
  if (diff === 0) return T('doc.today');
  if (diff === 1) return T('doc.tomorrow');
  return T('doc.due_days', { n: diff });
}

function getAccentColor(dok: Dokument, C: ThemeColors): string {
  if (dok.erledigt) return C.textTertiary;
  const tage = dok.frist ? Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86400000) : null;
  if (tage !== null && tage <= 0) return C.danger;   // bugün / gecikmiş → kırmızı
  if (tage !== null && tage <= 3) return C.warning;  // 1-3 gün → amber
  if (dok.risiko === 'hoch') return C.warning;        // yüksek risk → amber
  return C.border;                                    // normal → nötr
}

function quickIntent(dok: Dokument, C: ThemeColors) {
  const t = [dok.rohText, dok.zusammenfassung, dok.titel].filter(Boolean).join(' ').toLowerCase();
  if (/mahnung|inkasso|pfändung/.test(t) || dok.typ === 'Mahnung') return { PhIcon: WarningCircle, color: C.danger };
  if (/rechnung|zahlung|forderung/.test(t) || (dok.betrag && dok.betrag > 0)) return { PhIcon: Money, color: C.primary };
  if (/widerspruch|einspruch/.test(t)) return { PhIcon: PencilSimple, color: C.primaryDark };
  if (/termin|um\s+\d+:\d+/.test(t) || dok.typ === 'Termin') return { PhIcon: CalendarBlank, color: C.success };
  if (/bescheid|entscheidung/.test(t) || dok.typ === 'Behörde') return { PhIcon: FileText, color: C.primary };
  return { PhIcon: File, color: C.textTertiary };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DokumentKarteProps {
  dok: Dokument;
  onPress?: (dok: Dokument) => void;
  onLongPress?: (dok: Dokument) => void;
  secilen?: boolean;
  index?: number;
}

function DokumentKarteInner({ dok, onPress, onLongPress, secilen, index = 0 }: DokumentKarteProps) {
  const { Colors, fs, hitSlopScale } = useTheme();
  const { t: T } = useT();
  const accentColor = getAccentColor(dok, Colors);
  const tageText    = getTageText(dok.frist, T);
  const intent      = quickIntent(dok, Colors);
  const isDone      = dok.erledigt;
  const a11yLabel = [
    dok.typ, dok.titel, dok.absender,
    isDone ? T('doc.done') : tageText ? `Frist: ${tageText}` : null,
    dok.betrag ? `${(dok.betrag as number).toFixed(2)} Euro` : null,
  ].filter(Boolean).join(', ');

  const workflowTone = dok.workflowColor === 'green'
    ? { bg: Colors.successLight, text: Colors.successText }
    : dok.workflowColor === 'amber'
    ? { bg: Colors.warningLight, text: Colors.warningText }
    : dok.workflowColor === 'blue'
    ? { bg: Colors.primaryLight, text: Colors.primaryDark }
    : null;

  const listSnippet = excerptForDocumentListCard(dok);

  return (
    <DocumentSurface
      onPress={() => onPress?.(dok)}
      onLongPress={() => onLongPress?.(dok)}
      selected={!!secilen}
      accentColor={accentColor}
      accessibilityLabel={a11yLabel}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: Colors.bgInput, borderColor: Colors.borderLight, marginTop: 2 }]}>
          {isDone
            ? <CheckCircle size={22} color={Colors.textTertiary} weight="fill" />
            : <intent.PhIcon size={21} color={intent.color} weight="duotone" />
          }
        </View>

        <View style={styles.titleBox}>
          <Text
            style={[styles.title, { color: isDone ? Colors.textTertiary : Colors.text, fontSize: fs(14) }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {dok.titel}
          </Text>
          <Text style={[styles.absender, { color: Colors.textSecondary, fontSize: fs(12) }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {dok.absender}
          </Text>
        </View>

        {tageText && !isDone ? (
          <View style={[styles.dateBox, { backgroundColor: `${accentColor}12`, borderWidth: 1, borderColor: `${accentColor}55` }]}>
            <Clock size={11} color={accentColor} weight="regular" />
            <Text style={[styles.dateText, { color: accentColor }]}>{tageText}</Text>
          </View>
        ) : isDone ? (
          <View style={[styles.dateBox, { backgroundColor: Colors.bgInput }]}>
            <Text style={[styles.dateText, { color: Colors.textTertiary }]}>{T('doc.done')}</Text>
          </View>
        ) : null}
      </View>

      {!!listSnippet && (
        <Text style={[styles.summary, { color: Colors.textTertiary, fontSize: fs(12), lineHeight: fs(12) * 1.5 }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {listSnippet}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {dok.betrag && dok.betrag > 0 ? (
          <View style={[styles.amountBox, { backgroundColor: `${accentColor}12`, borderWidth: 1, borderColor: `${accentColor}44` }]}>
            <Money size={12} color={accentColor} weight="regular" />
            <Text style={[styles.amount, { color: accentColor, fontVariant: ['tabular-nums'] }]}>
              {(dok.betrag as number).toFixed(2)} €
            </Text>
          </View>
        ) : <View />}

        {!!dok.workflowStamp && workflowTone ? (
          <View style={[styles.workflowBox, { backgroundColor: workflowTone.bg }]}>
            <View style={[styles.workflowDot, { backgroundColor: workflowTone.text }]} />
            <Text style={[styles.workflowStamp, { color: workflowTone.text }]}>
              {dok.workflowStamp}
            </Text>
          </View>
        ) : null}
      </View>
    </DocumentSurface>
  );
}

const DokumentKarte = React.memo(DokumentKarteInner);
export default DokumentKarte;

const styles = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  iconBox:       { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1 },
  titleBox:      { flex: 1, gap: 3, minWidth: 0, justifyContent: 'center' },
  title:         { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  absender:      { fontSize: 12, letterSpacing: -0.1 },
  dateBox:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  dateText:      { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
  summary:       { fontSize: 12, lineHeight: 18, marginBottom: 10, letterSpacing: -0.1 },
  footer:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  amountBox:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  amount:        { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  workflowBox:   { flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '60%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  workflowDot:   { width: 6, height: 6, borderRadius: 3 },
  workflowStamp: { fontSize: 11, fontWeight: '800', letterSpacing: 0.1 },
});
