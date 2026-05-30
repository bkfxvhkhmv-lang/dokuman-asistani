import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { WarningCircle, Money, PencilSimple, CalendarBlank, FileText, File, Clock, CheckCircle, ShieldCheck } from 'phosphor-react-native';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import type { RiskPalette } from '@/theme';
import DocumentSurface from '@/components/document-surface/DocumentSurface';
import type { Dokument } from '@/store';
import { excerptForDocumentListCard, buildCardInsight } from '@/utils/listCardSummary';
import { safeDisplayAbsender, safeDisplayTitel } from '@/utils/displaySanitizer';
import { deriveNextStep, type NextStepUrgency } from '@/utils/deriveNextStep';
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

function getAccentColor(dok: Dokument, C: ThemeColors, Risk: RiskPalette): string {
  if (dok.erledigt) return C.textTertiary;
  if (dok.typ === 'Gutschrift') return C.success;
  const tage = dok.frist ? Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86400000) : null;
  const hasBetrag = typeof dok.betrag === 'number' && dok.betrag > 0;
  if (tage !== null && tage <= 0) return Risk.hoch.color;                    // overdue → red
  if (dok.typ === 'Mahnung' && hasBetrag) return Risk.hoch.color;            // confirmed debt escalation → red
  if (tage !== null && tage <= 7) return Risk.mittel.color;                  // within a week → amber
  if (dok.typ === 'Mahnung') return Risk.mittel.color;                       // Mahnung, betrag unclear → amber
  if (dok.risiko === 'mittel') return Risk.mittel.color;
  if (dok.risiko === 'hoch' && hasBetrag) return Risk.mittel.color;          // high risk only if amount confirmed
  return C.border;
}

type UrgencyBadgeInfo = { label: string; bg: string; textColor: string };

function buildUrgencyBadge(dok: Dokument, tage: number | null, C: ThemeColors): UrgencyBadgeInfo | null {
  if (dok.erledigt) return null;
  if (tage !== null && tage < 0)   return { label: 'Überfällig',   bg: C.dangerLight,  textColor: C.dangerText };
  if (tage !== null && tage === 0) return { label: 'Heute',        bg: C.dangerLight,  textColor: C.dangerText };
  if (tage !== null && tage <= 7)  return { label: 'Diese Woche',  bg: C.warningLight, textColor: C.warningText };
  if (tage === null && dok.confidence != null && dok.confidence < 70)
    return { label: 'Angaben prüfen', bg: C.warningLight, textColor: C.warningText };
  return null;
}

function quickIntent(dok: Dokument, C: ThemeColors) {
  const t = [dok.rohText, dok.zusammenfassung, dok.titel].filter(Boolean).join(' ').toLowerCase();
  if (/mahnung|inkasso|pfändung/.test(t) || dok.typ === 'Mahnung') return { PhIcon: WarningCircle, color: C.danger };
  if (/rechnung|zahlung|forderung/.test(t) || (dok.betrag && dok.betrag > 0)) return { PhIcon: Money, color: C.primary };
  if (/widerspruch|einspruch/.test(t)) return { PhIcon: PencilSimple, color: C.primaryDark };
  if (/termin|um\s+\d+:\d+/.test(t) || dok.typ === 'Termin') return { PhIcon: CalendarBlank, color: C.success };
  if (/bescheid|entscheidung/.test(t) || dok.typ === 'Behörde') return { PhIcon: FileText, color: C.primary };
  if (dok.typ === 'Versicherung') return { PhIcon: ShieldCheck, color: C.success };
  if (dok.typ === 'Vertrag') return { PhIcon: FileText, color: C.primaryDark };
  return { PhIcon: File, color: C.textSecondary };
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
  const { Colors, RiskColors, fs, hitSlopScale } = useTheme();
  const { t: T } = useT();
  const accentColor   = getAccentColor(dok, Colors, RiskColors);
  const tageText      = getTageText(dok.frist, T);
  const intent        = quickIntent(dok, Colors);
  const displayAbsender = safeDisplayAbsender(dok.absender, dok.confidence);
  const displayTitel    = safeDisplayTitel(dok.titel, dok.typ, dok.confidence);
  const tage = dok.frist ? Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86400000) : null;
  const isUrgent    = !dok.erledigt && (tage !== null && tage <= 7 || dok.risiko === 'hoch' || dok.typ === 'Mahnung');
  const isDone      = dok.erledigt;
  const a11yLabel = [
    dok.typ, dok.titel, dok.absender,
    isDone ? T('doc.done') : tageText ? `Frist: ${tageText}` : null,
    typeof dok.betrag === 'number' && dok.betrag > 0 ? `${dok.betrag.toFixed(2)} Euro` : null,
  ].filter(Boolean).join(', ');

  const workflowTone = dok.workflowColor === 'green'
    ? { bg: Colors.successLight, text: Colors.successText }
    : dok.workflowColor === 'amber'
    ? { bg: Colors.warningLight, text: Colors.warningText }
    : dok.workflowColor === 'blue'
    ? { bg: Colors.primaryLight, text: Colors.primaryDark }
    : null;

  const listSnippet    = excerptForDocumentListCard(dok);
  const cardInsight    = buildCardInsight(dok);
  const secondaryLine  = cardInsight ?? listSnippet ?? null;
  const nextStep       = deriveNextStep(dok);
  const urgencyBadge   = buildUrgencyBadge(dok, tage, Colors);

  const nextStepColors = (urgency: NextStepUrgency) => {
    if (urgency === 'critical') return { bg: Colors.dangerLight,  text: Colors.dangerText  };
    if (urgency === 'warning')  return { bg: Colors.warningLight, text: Colors.warningText };
    return                             { bg: Colors.primaryLight, text: Colors.primaryDark };
  };

  return (
    <DocumentSurface
      onPress={() => onPress?.(dok)}
      onLongPress={() => onLongPress?.(dok)}
      selected={!!secilen}
      accentColor={accentColor}
      urgent={isUrgent}
      accessibilityLabel={a11yLabel}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBox, {
          backgroundColor: isDone ? Colors.bgInput : `${intent.color}14`,
          borderColor: isDone ? Colors.borderLight : `${intent.color}35`,
          marginTop: 2,
        }]}>
          {isDone
            ? <CheckCircle size={24} color={Colors.textTertiary} weight="fill" />
            : <intent.PhIcon size={24} color={intent.color} weight="regular" />
          }
        </View>

        <View style={styles.titleBox}>
          <Text
            style={[styles.title, { color: isDone ? Colors.textTertiary : Colors.text, fontSize: fs(14) }]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {displayTitel}
          </Text>
          <Text style={[styles.absender, { color: Colors.textSecondary, fontSize: fs(12) }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {displayAbsender}
          </Text>
        </View>

        {tageText && !isDone ? (
          <View style={[styles.dateBox, { backgroundColor: `${accentColor}0d`, borderWidth: 1, borderColor: `${accentColor}44` }]}>
            <Clock size={13} color={accentColor} weight="regular" />
            <Text style={[styles.dateText, { color: accentColor }]}>{tageText}</Text>
          </View>
        ) : isDone ? (
          <View style={[styles.dateBox, { backgroundColor: Colors.bgInput }]}>
            <Text style={[styles.dateText, { color: Colors.textTertiary }]}>{T('doc.done')}</Text>
          </View>
        ) : null}
      </View>

      {!!secondaryLine && (
        <Text
          style={[styles.summary, { color: cardInsight ? Colors.text : Colors.textSecondary, fontSize: fs(12), lineHeight: fs(12) * 1.5 }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {secondaryLine}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {typeof dok.betrag === 'number' && dok.betrag !== 0 ? (
          <View style={[styles.amountBox, { backgroundColor: `${intent.color}1a`, borderWidth: 1, borderColor: `${intent.color}33` }]}>
            <Money size={13} color={intent.color} weight="regular" />
            <Text style={[styles.amount, { color: intent.color, fontVariant: ['tabular-nums'] }]}>
              {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(dok.betrag)} €
            </Text>
          </View>
        ) : <View />}

        {dok.isDemo ? (
          <View style={[styles.demoBadge, { backgroundColor: Colors.primaryLight, borderColor: Colors.primary + '33' }]}>
            <Text style={[styles.demoBadgeText, { color: Colors.primaryDark }]}>DEMO</Text>
          </View>
        ) : !!dok.workflowStamp && workflowTone ? (
          <View style={[styles.workflowBox, { backgroundColor: workflowTone.bg }]}>
            <View style={[styles.workflowDot, { backgroundColor: workflowTone.text }]} />
            <Text style={[styles.workflowStamp, { color: workflowTone.text }]}>
              {dok.workflowStamp}
            </Text>
          </View>
        ) : urgencyBadge ? (
          <View style={[styles.urgencyBox, { backgroundColor: urgencyBadge.bg }]}>
            <Text style={[styles.urgencyText, { color: urgencyBadge.textColor }]}>
              {urgencyBadge.label}
            </Text>
          </View>
        ) : nextStep && nextStep.key !== 'overdue' && nextStep.key !== 'review' ? (
          <View style={[styles.nextStepBox, { backgroundColor: nextStepColors(nextStep.urgency).bg }]}>
            <Text style={[styles.nextStepText, { color: nextStepColors(nextStep.urgency).text }]}>
              {nextStep.label}
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
  iconBox:       { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1 },
  titleBox:      { flex: 1, gap: 3, minWidth: 0, justifyContent: 'center' },
  title:         { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  absender:      { fontSize: 12, letterSpacing: -0.1 },
  dateBox:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  dateText:      { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
  summary:       { fontSize: 12, lineHeight: 18, marginBottom: 10, letterSpacing: -0.1 },
  footer:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  amountBox:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  amount:        { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  workflowBox:   { flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '60%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  workflowDot:   { width: 6, height: 6, borderRadius: 3 },
  workflowStamp: { fontSize: 11, fontWeight: '800', letterSpacing: 0.1 },
  demoBadge:     { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  demoBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  nextStepBox:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  nextStepText:  { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
  urgencyBox:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  urgencyText:   { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
});
