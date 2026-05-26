/**
 * AnalyseHeaderCard — scanned document at-a-glance for the Analyse tab.
 *
 * Answers in one screen-height: status, sender, amount, deadline, next step.
 * OCR confidence pill prevents users from acting on bad data.
 */
import React from 'react';
import { View, Text } from 'react-native';
import AiSparkle from '@/components/AiSparkle';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import {
  computeDocumentStatus,
  DOCUMENT_STATUS_UI,
} from '@/features/detail/constants/documentStatus';
import { formatBetrag, formatFrist, getTageVerbleibend } from '@/utils/formatters';
import { safeDisplayAbsender } from '@/utils/displaySanitizer';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import type { Dokument } from '@/store';

interface Props {
  dok: Dokument;
  actionPlan: ActionPlan | null;
}

function statusColors(colorKey: string, C: any) {
  if (colorKey === 'danger')  return { bg: C.dangerLight,  text: C.danger };
  if (colorKey === 'warning') return { bg: C.warningLight, text: C.warning };
  if (colorKey === 'success') return { bg: C.successLight, text: C.success };
  return { bg: C.bgInput, text: C.textSecondary };
}

function confidenceLabel(conf: number): string {
  if (conf >= 75) return 'KI-geprüft';
  if (conf >= 55) return 'Angaben prüfen';
  return 'Einige Angaben prüfen';
}

function confidenceColor(conf: number, C: any): string {
  if (conf >= 75) return C.success;
  return C.warning;
}

export default function AnalyseHeaderCard({ dok, actionPlan }: Props) {
  const { Colors: C, S, R } = useTheme();

  const status   = computeDocumentStatus(dok);
  const statusUi = DOCUMENT_STATUS_UI[status];
  const sc       = statusColors(statusUi.colorKey, C);

  const conf     = dok.confidence;
  const tage     = dok.frist ? getTageVerbleibend(dok.frist) : null;
  const fristStr = dok.frist ? formatFrist(dok.frist) : null;
  const fristCol = tage === null ? C.text
    : tage < 0   ? C.danger
    : tage <= 3  ? C.danger
    : tage <= 7  ? C.warning
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
        paddingHorizontal: S.md, paddingTop: 14, paddingBottom: 8,
      }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: sc.bg }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: sc.text }}>{statusUi.label}</Text>
        </View>
        {conf != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AiSparkle />
            <Text style={{ fontSize: 10, fontWeight: '600', color: confidenceColor(conf, C) }}>
              {confidenceLabel(conf)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Typ · Absender ───────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: S.md, paddingBottom: hasFacts ? 10 : 14 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.4 }} numberOfLines={1}>
          {dok.typ ? dok.typ.toUpperCase() : 'SONSTIGES'}
          {dok.absender ? ` · ${safeDisplayAbsender(dok.absender, dok.confidence)}` : ''}
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
              flex: 1, padding: S.md,
              borderRightWidth: dok.frist ? 0.5 : 0, borderRightColor: C.borderLight,
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, marginBottom: 4, letterSpacing: 0.5 }}>
                {dok.betrag < 0 ? 'GUTSCHRIFT' : 'BETRAG'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>
                  {formatBetrag(Math.abs(dok.betrag), dok.waehrung || '€')}
                </Text>
                {conf != null && <AiSparkle />}
              </View>
            </View>
          ) : null}

          {dok.frist ? (
            <View style={{ flex: 1, padding: S.md }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, marginBottom: 4, letterSpacing: 0.5 }}>
                FRIST
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: fristCol }}>
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

      {/* ── Nächster Schritt footer ───────────────────────────────────────── */}
      {actionPlan?.primary ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: S.md, paddingVertical: 10,
          borderTopWidth: 0.5, borderTopColor: C.borderLight,
          backgroundColor: C.bgInput,
        }}>
          <Icon name={actionPlan.primary.icon} size={16} color={C.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, flex: 1 }}>
            {actionPlan.primary.label}
          </Text>
          <Text style={{ fontSize: 14, color: C.textTertiary }}>›</Text>
        </View>
      ) : null}
    </View>
  );
}
