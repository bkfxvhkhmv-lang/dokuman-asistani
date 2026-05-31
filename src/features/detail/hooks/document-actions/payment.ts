import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Dokument, StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import { composePartnerPaymentNotice } from '@/features/detail/services/documentActionFlows';
import { openBankingAppWithPayment } from '@/services/formFillerService';
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
  if (!dok) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const hasRecipient = !!(dok.absender && !/^unbekannt/i.test(dok.absender.trim()));
  if (dok.betrag == null || !hasPaymentTarget(dok) || !hasRecipient) {
    Alert.alert('Zahlungsdaten fehlen', 'Bitte Betrag, Empfänger und IBAN prüfen.');
    return;
  }

  modal.open('options', {
    title: 'Zahlung vorbereiten',
    message: [
      `Betrag: ${formatBetrag(dok.betrag, dok.waehrung || '€') ?? '—'}`,
      `Empfänger: ${dok.absender}`,
      `IBAN: ${dok.iban ?? '—'}`,
    ].join('\n'),
    options: [
      {
        text: 'Banking-App öffnen',
        onPress: async () => {
          const result = await openBankingAppWithPayment(dok);
          if (result.opened) {
            modal.open('confirm', {
              title: 'Zahlung abgeschlossen?',
              message: 'Wenn die Überweisung erledigt ist, markieren wir das Dokument als erledigt.',
              actions: [
                { text: 'Später' },
                {
                  text: 'Als erledigt markieren',
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
            title: 'Banking-App nicht gefunden',
            message: result.copied
              ? 'Die Zahlungsdaten wurden kopiert. Öffne deine Banking-App manuell und füge sie dort ein.'
              : 'Es konnte keine Banking-App geöffnet werden.',
          });
        },
      },
      { text: 'Abbrechen', style: 'cancel' },
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
  if (!dok) return;
  const hasRecipient = !!(dok.absender && !/^unbekannt/i.test(dok.absender.trim()));
  if (dok.betrag == null || !hasPaymentTarget(dok) || !hasRecipient) {
    Alert.alert('Zahlungsdaten fehlen', 'Bitte Betrag, Empfänger und IBAN prüfen.');
    return;
  }

  modal.open('options', {
    title: 'Zahlung vorbereiten',
    message: [
      `Betrag: ${formatBetrag(dok.betrag, dok.waehrung || '€') ?? '—'}`,
      `Empfänger: ${dok.absender}`,
      `IBAN: ${dok.iban ?? '—'}`,
      partnerEmail ? `Partner: ${partnerEmail}` : null,
    ].filter(Boolean).join('\n'),
    options: [
      {
        text: 'Banking-App öffnen',
        onPress: async () => {
          const result = await openBankingAppWithPayment(dok);
          if (result.opened) {
            await composePartnerPaymentNotice(dok, partnerEmail ?? undefined);
            modal.open('confirm', {
              title: 'Zahlung abgeschlossen?',
              message: 'Wenn die Überweisung erledigt ist, markieren wir das Dokument als erledigt.',
              actions: [
                { text: 'Später' },
                {
                  text: 'Als erledigt markieren',
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
            title: 'Banking-App nicht gefunden',
            message: result.copied
              ? 'Die Zahlungsdaten wurden kopiert. Öffne deine Banking-App manuell und füge sie dort ein.'
              : 'Es konnte keine Banking-App geöffnet werden.',
          });
        },
      },
      { text: 'Abbrechen', style: 'cancel' },
    ],
  });
}
