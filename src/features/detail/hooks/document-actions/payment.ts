import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Dokument, StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import { composePartnerPaymentNotice } from '@/features/detail/services/documentActionFlows';
import { openBankingAppWithPayment } from '@/services/formFillerService';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';
import { formatBetrag } from '@/utils/formatters';
import { hasPaymentTarget } from '@/utils/documentGuards';
import type { CommitOutcomeFn } from './types';

export function runHandleZahlen(params: {
  dok: Dokument | undefined;
  dokId: string;
  dispatch: (action: StoreAction) => void;
  modal: ModalController;
  router: { back: () => void };
  commitOutcome: CommitOutcomeFn;
}): void {
  const { dok, dokId, dispatch, modal, router, commitOutcome } = params;
  const lang = getLangSync();
  if (!dok) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const hasRecipient = !!(dok.absender && !/^unbekannt/i.test(dok.absender.trim()));
  if (dok.betrag == null || !hasPaymentTarget(dok) || !hasRecipient) {
    Alert.alert(t(lang, 'payment.notice.missing_title'), t(lang, 'payment.notice.missing_body'));
    return;
  }

  modal.open('options', {
    title: t(lang, 'payment.sheet.title'),
    message: [
      `${t(lang, 'payment.sheet.amount')}: ${formatBetrag(dok.betrag, dok.waehrung || '€') ?? '—'}`,
      `${t(lang, 'payment.sheet.recipient')}: ${dok.absender}`,
      `${t(lang, 'payment.sheet.iban')}: ${dok.iban ?? '—'}`,
    ].join('\n'),
    options: [
      {
        text: t(lang, 'payment.sheet.open_banking'),
        onPress: async () => {
          const result = await openBankingAppWithPayment(dok);
          if (result.opened) {
            modal.open('confirm', {
              title: t(lang, 'payment.notice.completed_title'),
              message: t(lang, 'payment.notice.completed_body'),
              actions: [
                { text: t(lang, 'common.later') },
                {
                  text: t(lang, 'payment.notice.mark_done'),
                  onPress: () => {
                    dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
                    commitOutcome('pay');
                    router.back();
                  },
                },
              ],
            });
            return;
          }

          modal.open('notice', {
            title: t(lang, 'payment.notice.no_app_title'),
            message: result.copied
              ? t(lang, 'payment.notice.no_app_copied')
              : t(lang, 'payment.notice.no_app_body'),
          });
        },
      },
      { text: t(lang, 'common.cancel'), style: 'cancel' },
    ],
  });
}

export function runHandleZahlenMitPartner(params: {
  dok: Dokument | undefined;
  dokId: string;
  partnerEmail?: string | null;
  dispatch: (action: StoreAction) => void;
  modal: ModalController;
  router: { back: () => void };
  commitOutcome: CommitOutcomeFn;
}): void {
  const { dok, dokId, partnerEmail, dispatch, modal, router, commitOutcome } = params;
  const lang = getLangSync();
  if (!dok) return;
  const hasRecipient = !!(dok.absender && !/^unbekannt/i.test(dok.absender.trim()));
  if (dok.betrag == null || !hasPaymentTarget(dok) || !hasRecipient) {
    Alert.alert(t(lang, 'payment.notice.missing_title'), t(lang, 'payment.notice.missing_body'));
    return;
  }

  modal.open('options', {
    title: t(lang, 'payment.sheet.title'),
    message: [
      `${t(lang, 'payment.sheet.amount')}: ${formatBetrag(dok.betrag, dok.waehrung || '€') ?? '—'}`,
      `${t(lang, 'payment.sheet.recipient')}: ${dok.absender}`,
      `${t(lang, 'payment.sheet.iban')}: ${dok.iban ?? '—'}`,
      partnerEmail ? `${t(lang, 'payment.sheet.partner')}: ${partnerEmail}` : null,
    ].filter(Boolean).join('\n'),
    options: [
      {
        text: t(lang, 'payment.sheet.open_banking'),
        onPress: async () => {
          const result = await openBankingAppWithPayment(dok);
          if (result.opened) {
            await composePartnerPaymentNotice(dok, partnerEmail ?? undefined);
            modal.open('confirm', {
              title: t(lang, 'payment.notice.completed_title'),
              message: t(lang, 'payment.notice.completed_body'),
              actions: [
                { text: t(lang, 'common.later') },
                {
                  text: t(lang, 'payment.notice.mark_done'),
                  onPress: () => {
                    dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
                    commitOutcome('pay', {
                      timeline: partnerEmail ? 'Heute bezahlt und Partner informiert' : 'Heute bezahlt',
                    });
                    router.back();
                  },
                },
              ],
            });
            return;
          }

          modal.open('notice', {
            title: t(lang, 'payment.notice.no_app_title'),
            message: result.copied
              ? t(lang, 'payment.notice.no_app_copied')
              : t(lang, 'payment.notice.no_app_body'),
          });
        },
      },
      { text: t(lang, 'common.cancel'), style: 'cancel' },
    ],
  });
}
