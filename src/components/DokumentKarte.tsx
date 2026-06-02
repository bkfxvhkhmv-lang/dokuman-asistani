import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { WarningCircle, Money, PencilSimple, CalendarBlank, FileText, File, Clock, CheckCircle, ShieldCheck } from 'phosphor-react-native';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import type { RiskPalette } from '@/theme';
import DocumentSurface from '@/components/document-surface/DocumentSurface';
import type { Dokument } from '@/store';
import { excerptForDocumentListCard, buildCardInsight } from '@/utils/listCardSummary';
import { resolveDocumentTitle, resolveDocumentSender } from '@/utils/displaySanitizer';
import { deriveNextStep, type NextStepUrgency } from '@/utils/deriveNextStep';
import { translateDocumentTypeLabel } from '@/i18n/documentTypeLabels';
import { translateLegacyBusinessLabel } from '@/i18n/legacyBusinessLabels';
import { useT } from '@/hooks/useT';
import { needsManualReview } from '@/utils/documentGuards';
import { resolveDisplayDocumentType } from '@/constants/docTypeConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTageText(frist: string | null | undefined, T: (key: string, vars?: Record<string, string | number>) => string): string | null {
  if (!frist) return null;
  const diff = Math.ceil((new Date(frist).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return T('doc.overdue');
  if (diff === 0) return T('doc.today');
  if (diff === 1) return T('doc.tomorrow');
  return T('doc.due_days', { n: diff });
}

function getAccentColor(dok: Dokument, displayType: string, C: ThemeColors, Risk: RiskPalette): string {
  if (dok.erledigt) return C.textTertiary;
  if (displayType === 'Gutschrift') return C.success;
  const tage = dok.frist ? Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86400000) : null;
  const hasBetrag = typeof dok.betrag === 'number' && dok.betrag > 0;
  if (tage !== null && tage <= 0) return Risk.hoch.color;                    // overdue → red
  if (/mahnung/i.test(displayType) && hasBetrag) return Risk.hoch.color;     // confirmed debt escalation → red
  if (tage !== null && tage <= 7) return Risk.mittel.color;                  // within a week → amber
  if (/mahnung/i.test(displayType)) return Risk.mittel.color;                // Mahnung, betrag unclear → amber
  if (dok.risiko === 'mittel' && dok.confidence != null && dok.confidence >= 55) return Risk.mittel.color;
  if (dok.risiko === 'hoch' && hasBetrag) return Risk.mittel.color;          // high risk only if amount confirmed
  return C.border;
}

type UrgencyBadgeInfo = { label: string; bg: string; textColor: string };

function buildUrgencyBadge(
  dok: Dokument,
  tage: number | null,
  cardInsight: string | null,
  C: ThemeColors,
  T: (key: string, vars?: Record<string, string | number>) => string,
): UrgencyBadgeInfo | null {
  if (dok.erledigt) return null;
  if (tage !== null && tage < 0)   return { label: T('doc.overdue'),   bg: C.dangerLight,  textColor: C.dangerText };
  if (tage !== null && tage === 0) return { label: T('doc.today'),     bg: C.dangerLight,  textColor: C.dangerText };
  if (tage !== null && tage <= 7)  return { label: T('doc.this_week'), bg: C.warningLight, textColor: C.warningText };
  // "Angaben prüfen" only when low confidence AND no structured insight already tells the story
  if (tage === null && !cardInsight && needsManualReview(dok))
    return { label: T('review.label'), bg: C.warningLight, textColor: C.warningText };
  return null;
}

function quickIntent(dok: Dokument, displayType: string, C: ThemeColors) {
  const { config: cfg } = resolveDisplayDocumentType(dok.aiDocumentType ?? displayType, dok.rohText, dok.titel);
  if (cfg.shortLabel === 'Rechnung') return { PhIcon: Money, color: C.primary };
  if (cfg.shortLabel === 'Versicherung') return { PhIcon: ShieldCheck, color: C.success };
  if (cfg.shortLabel === 'Behörde') return { PhIcon: FileText, color: C.primary };
  if (cfg.shortLabel === 'Vertrag') return { PhIcon: FileText, color: C.primaryDark };
  const t = [dok.rohText, dok.zusammenfassung, dok.titel].filter(Boolean).join(' ').toLowerCase();
  if (/mahnung/i.test(displayType) || /mahnung|inkasso|pfändung/.test(t)) return { PhIcon: WarningCircle, color: C.danger };
  if (/termin/i.test(displayType) || /termin|um\s+\d+:\d+/.test(t)) return { PhIcon: CalendarBlank, color: C.success };
  if (/widerspruch|einspruch/.test(t)) return { PhIcon: PencilSimple, color: C.primaryDark };
  if (/rechnung|zahlung|forderung/.test(t) || /rechnung/i.test(displayType) || (dok.betrag && dok.betrag > 0)) return { PhIcon: Money, color: C.primary };
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
  const { t: T, lang } = useT();
  const displayTypeInfo = resolveDisplayDocumentType(dok.aiDocumentType ?? dok.typ, dok.rohText, dok.titel);
  const displayType = displayTypeInfo.detailLabel;
  const reviewDok = { ...dok, typ: displayType };
  const accentColor   = getAccentColor(dok, displayType, Colors, RiskColors);
  const tageText      = getTageText(dok.frist, T);
  const intent        = quickIntent(dok, displayType, Colors);
  const displayAbsender = resolveDocumentSender(dok);
  const rawTitel        = resolveDocumentTitle(dok);
  const displayTitel    = translateLegacyBusinessLabel(rawTitel, lang);
  const localizedType   = translateDocumentTypeLabel(displayType, lang);
  const workflowStampLabel = translateLegacyBusinessLabel(dok.workflowStamp, lang);
  const tage = dok.frist ? Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86400000) : null;
  const isUrgent    = !dok.erledigt && (tage !== null && tage <= 7 || dok.risiko === 'hoch' || /mahnung/i.test(displayType));
  const isDone      = dok.erledigt;
  const a11yLabel = [
    localizedType, displayTitel, displayAbsender || dok.absender,
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

  const listSnippet    = excerptForDocumentListCard(dok, { appLang: T('common.lang_code') });
  const cardInsight    = buildCardInsight(reviewDok);
  const secondaryLine  = cardInsight ?? listSnippet ?? null;
  const nextStep       = deriveNextStep(reviewDok);
  const urgencyBadge   = buildUrgencyBadge(reviewDok, tage, cardInsight, Colors, T);

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
              {workflowStampLabel}
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
  workflowStamp: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  demoBadge:     { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  demoBadgeText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },
  nextStepBox:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  nextStepText:  { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
  urgencyBox:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  urgencyText:   { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
});
