import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import { AppCard } from '@/design/components';
import { T } from '@/design/tokens';
import Icon from '@/components/Icon';
import type { Dokument } from '@/store';
import type { DocumentDigitalTwinModel } from '@/core/intelligence/DocumentDigitalTwin';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import { getReviewIssues } from '@/utils/documentGuards';
import { getPrimaryAction, NO_LEGAL_ADVICE_DISCLAIMER } from '@/features/detail/constants/actionMapping';
import { useT } from '@/hooks/useT';

const ACTION_HINT: Partial<Record<string, string>> = {
  ai:          'detail.actions.hint.understand',
  zahlen:      'detail.actions.hint.pay',
  zahlendaten: 'detail.actions.hint.check_payment_data',
  gutschrift:  'detail.actions.hint.credit_note',
  kalender:    'detail.actions.hint.calendar',
  mail:        'detail.actions.hint.mail',
  einspruch:   'detail.actions.hint.objection',
};

function toneColors(tone: string, colors: ThemeColors) {
  if (tone === 'danger')  return { bg: colors.dangerLight,  border: colors.dangerBorder, text: colors.danger };
  if (tone === 'success') return { bg: colors.successLight, border: `${colors.success}44`, text: colors.success };
  if (tone === 'warning') return { bg: colors.warningLight, border: `${colors.warning}55`, text: colors.warningText || colors.warning };
  if (tone === 'primary') return { bg: colors.primaryLight, border: `${colors.primary}33`, text: colors.primaryDark };
  return { bg: colors.bgCard, border: colors.border, text: colors.text };
}

function buildReviewContext(
  dok: Dokument,
  TFn: (key: string, params?: Record<string, string | number>) => string,
): { title: string; body: string } | null {
  const issues = getReviewIssues(dok);
  const confidence = dok.confidence ?? 100;
  if (issues.includes('amount'))   return { title: TFn('detail.review.amount_title'),   body: TFn('detail.review.amount_body') };
  if (issues.includes('deadline')) return { title: TFn('detail.review.deadline_title'), body: TFn('detail.review.deadline_body') };
  if (issues.includes('sender'))   return { title: TFn('detail.review.sender_title'),   body: TFn('detail.review.sender_body') };
  const isPaymentDoc = /rechnung|mahnung|bußgeld|bussgeld|steuer|beitrag/i.test(dok.typ ?? '');
  if (confidence < 55 && isPaymentDoc && dok.betrag != null) {
    return { title: TFn('detail.review.payment_title'), body: TFn('detail.review.payment_body') };
  }
  if (confidence < 55) return { title: TFn('detail.review.confirm_title'), body: TFn('detail.review.confirm_body') };
  return null;
}

interface Props {
  dok: Dokument;
  actionPlan: ActionPlan;
  digitalTwin?: DocumentDigitalTwinModel | null;
}

/** At most two visible action surfaces: primary card + one secondary chip. */
export function DetailVisibleActionCards({ dok, actionPlan, digitalTwin }: Props) {
  const { Colors: C, S, R } = useTheme();
  const { t } = useT();
  const { primary, secondary } = actionPlan;
  const visibleSecondary = secondary[0];

  const localizedPrimaryLabel =
    primary.key === 'review' ? t('detail.review.check_details') : t(primary.labelKey);

  const processTone = primary.key === 'review'      ? 'warning'
    : primary.key === 'zahlendaten' ? 'warning'
    : primary.key === 'einspruch'   ? 'danger'
    : primary.key === 'kalender'    ? 'success'
    : primary.key === 'zahlen'      ? 'primary' : 'neutral';
  const processColors = toneColors(processTone, C);

  const reviewCtx = primary.key === 'review' ? buildReviewContext(dok, t) : null;
  const showPrimary = primary.onPress && (primary.key !== 'review' || reviewCtx);

  if (!showPrimary && !visibleSecondary?.onPress) return null;

  return (
    <View style={{ marginTop: S.md }}>
      {showPrimary && (
        <TouchableOpacity onPress={primary.onPress} activeOpacity={0.8}>
          <AppCard style={{ marginBottom: visibleSecondary ? 10 : 0 }} padding={S.md} radius={R.lg} borderColor={processColors.border} backgroundColor={processColors.bg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name={primary.icon} size={22} color={processColors.text} />
              <View style={{ flex: 1 }}>
                <Text style={[T.title, { color: processColors.text }]}>
                  {primary.key === 'review' ? reviewCtx!.title : localizedPrimaryLabel}
                </Text>
                <Text style={[T.meta, { color: C.textSecondary, marginTop: 4 }]}>
                  {primary.key === 'review'
                    ? reviewCtx!.body
                    : digitalTwin?.statusSummary || (ACTION_HINT[primary.key] ? t(ACTION_HINT[primary.key]!) : getPrimaryAction(dok.typ).sublabel)}
                </Text>
                {primary.key === 'einspruch' && (
                  <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 6, fontStyle: 'italic' }}>
                    {NO_LEGAL_ADVICE_DISCLAIMER}
                  </Text>
                )}
              </View>
              <Icon name="caret-right" size={16} color={processColors.text} />
            </View>
          </AppCard>
        </TouchableOpacity>
      )}

      {visibleSecondary?.onPress && (
        <TouchableOpacity
          onPress={visibleSecondary.onPress}
          activeOpacity={0.8}
          style={{
            borderRadius: R.lg,
            paddingVertical: 12,
            paddingHorizontal: S.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: toneColors(visibleSecondary.tone ?? 'neutral', C).border,
            backgroundColor: C.bgCard,
          }}
        >
          <Icon name={visibleSecondary.icon} size={20} color={toneColors(visibleSecondary.tone ?? 'neutral', C).text} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: C.text }}>
            {t(visibleSecondary.labelKey)}
          </Text>
          <Icon name="caret-right" size={14} color={C.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
