import * as Haptics from 'expo-haptics';
import type { Dokument, StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import {
  buildPaymentSheetData,
  composePartnerPaymentNotice,
} from '@/features/detail/services/documentActionFlows';
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
  modal.open('payment', buildPaymentSheetData(dok, {
    onMarkPaid: () => {
      dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
      commitOutcome('pay');
      router.back();
    },
  }) as any);
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
  modal.open('payment', buildPaymentSheetData(dok, {
    partnerEmail: (partnerEmail || null) as null | undefined,
    onMarkPaid: async () => {
      dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
      await composePartnerPaymentNotice(dok, partnerEmail ?? undefined);
      commitOutcome('pay', {
        timeline: partnerEmail ? 'Heute bezahlt und Partner informiert' : 'Heute bezahlt',
      });
      router.back();
    },
  }) as any);
}
