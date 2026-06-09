/**
 * AnalyseHeaderCard — scanned document at-a-glance for the Analyse tab.
 *
 * Answers in one screen-height: status, sender, amount, deadline.
 * OCR confidence pill prevents users from acting on bad data.
 * Next-step guidance lives in NaechsterSchrittCard, not here.
 */
import React from 'react';
import { View, Text } from 'react-native';
import AiSparkle from '@/components/AiSparkle';
import { useTheme } from '@/ThemeContext';
import { T } from '@/design/tokens';
import {
  computeDocumentStatus,
  DOCUMENT_STATUS_UI,
} from '@/features/detail/constants/documentStatus';
import { formatBetrag, formatFrist, getTageVerbleibend } from '@/utils/formatters';
import { resolveDocumentSender } from '@/utils/displaySanitizer';
import type { Dokument } from '@/store';
import { getReviewLabel } from '@/utils/documentGuards';
import { getDetailTypeLabel } from '@/constants/docTypeConfig';
import { useT } from '@/hooks/useT';
import { translateDocumentTypeLabel } from '@/i18n/documentTypeLabels';

interface Props {
  dok: Dokument;
}

function statusColors(colorKey: string, C: any) {
  if (colorKey === 'danger')  return { bg: C.dangerLight,  text: C.danger };
  if (colorKey === 'warning') return { bg: C.warningLight, text: C.warningText };
  if (colorKey === 'success') return { bg: C.successLight, text: C.success };
  return { bg: C.bgInput, text: C.textSecondary };
}

function confidenceColor(conf: number, C: any): string {
  if (conf >= 75) return C.success;
  return C.warningText;
}

export default function AnalyseHeaderCard({ dok }: Props) {
  const { Colors: C, S, R } = useTheme();
  const { t: TT, lang } = useT();

  const status   = computeDocumentStatus(dok);
  const statusUi = DOCUMENT_STATUS_UI[status];
  const sc       = statusColors(statusUi.colorKey, C);

  const conf     = dok.confidence;
  const reviewLabel = getReviewLabel(dok);
  const typeLabel = translateDocumentTypeLabel(getDetailTypeLabel(dok.aiDocumentType ?? dok.typ, dok.rohText, dok.titel), lang);
  const tage     = dok.frist ? getTageVerbleibend(dok.frist) : null;
  const fristStr = dok.frist ? formatFrist(dok.frist) : null;
  const fristCol = tage === null ? C.text
    : tage < 0   ? C.danger
    : tage <= 3  ? C.danger
    : tage <= 7  ? C.warningText
    : C.text;
  const tageStr  = tage === null ? null
    : tage < 0   ? `${Math.abs(tage)} Tage überfällig`
    : tage === 0 ? 'Heute fällig'
    : `Noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'}`;

  const hasFacts = !!(dok.betrag || dok.frist);

  return (
    <View style={{
      marginHorizontal: S.md, marginBottom: S.md,
      borderRadius: R.lg, borderWidth: 1, borderColor: C.borderLight,
      backgroundColor: C.bgCard, overflow: 'hidden',
    }}>
      {/* ── Top row: status + OCR confidence ─────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: S.lg, paddingTop: 16, paddingBottom: 8,
      }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: sc.bg }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: sc.text }}>{TT(statusUi.labelKey)}</Text>
        </View>
        {status !== 'needs_review' && conf != null && (reviewLabel || conf >= 75) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AiSparkle />
          <Text style={{ fontSize: 10, fontWeight: '600', color: confidenceColor(conf, C) }}>
              {reviewLabel ?? TT('detail.trust.ai_checked')}
          </Text>
        </View>
      )}
      </View>

      {/* ── Typ · Absender ───────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: S.lg, paddingBottom: hasFacts ? 10 : 16 }}>
        <Text style={{ ...T.label, color: C.textTertiary, letterSpacing: 0.4 }} numberOfLines={1}>
          {typeLabel ? typeLabel.toUpperCase() : TT('doc.type.other').toUpperCase()}
          {(() => { const s = resolveDocumentSender(dok); return s ? ` · ${s}` : ''; })()}
        </Text>
      </View>

      {/* ── Betrag | Frist two-column ─────────────────────────────────────── */}
      {hasFacts && (
        <View style={{
          flexDirection: 'row',
          borderTopWidth: 0.5, borderTopColor: C.borderLight,
        }}>
          {dok.betrag != null ? (
            <View style={{
              flex: 1, padding: S.lg,
              borderRightWidth: dok.frist ? 0.5 : 0, borderRightColor: C.borderLight,
            }}>
              <Text style={{ ...T.label, color: C.textTertiary, marginBottom: 4 }}>
                {dok.betrag < 0 ? TT('doc.type.credit_note').toUpperCase() : TT('field.amount').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ ...T.heroNumber, color: C.text }}>
                  {formatBetrag(Math.abs(dok.betrag), dok.waehrung || '€')}
                </Text>
                {conf != null && <AiSparkle />}
              </View>
            </View>
          ) : null}

          {dok.frist ? (
            <View style={{ flex: 1, padding: S.md }}>
              <Text style={{ ...T.label, color: C.textTertiary, marginBottom: 4 }}>
                {TT('field.deadline').toUpperCase()}
              </Text>
              <Text style={{ ...T.heroNumber, color: fristCol }}>
                {fristStr}
              </Text>
              {tageStr ? (
                <Text style={{ fontSize: 10, fontWeight: '600', color: fristCol, marginTop: 2 }}>
                  {tageStr}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      )}

    </View>
  );
}
