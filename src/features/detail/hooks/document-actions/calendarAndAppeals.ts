import * as Haptics from 'expo-haptics';
import type { Dokument } from '@/store';
import type { StoreAction } from '@/store/actions';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import {
  buildEinspruchSheetText,
  composeInstitutionMailWithAttachment,
} from '@/features/detail/services/documentActionFlows';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';
import { addToCalendar, scheduleFristLocalNotifications, exportierePDF } from '@/utils';
import type { ActionSessionPayload, CommitOutcomeFn } from './types';

type OpenNotice = (title: string, message: string) => void;

export async function runHandleKalender(params: {
  dok: Dokument | undefined;
  openNotice: OpenNotice;
  dispatch?: (a: StoreAction) => void;
  dokId?: string;
}): Promise<void> {
  const { dok, openNotice, dispatch, dokId } = params;
  const lang = getLangSync();
  if (!dok?.frist) {
    openNotice(t(lang, 'calendar.notice.no_date_title'), t(lang, 'calendar.notice.no_date_body'));
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const ok = await addToCalendar(dok);
  if (!ok) {
    openNotice(t(lang, 'calendar.notice.unavailable_title'), t(lang, 'calendar.notice.unavailable_body'));
    return;
  }
  if (dispatch && dokId) {
    dispatch({ type: 'UPDATE_DOKUMENT', payload: { id: dokId, fristImKalender: true } });
  }
  await scheduleFristLocalNotifications({ ...dok, fristImKalender: true });
  openNotice(t(lang, 'calendar.notice.success_title'), t(lang, 'calendar.notice.success_body'));
}

export function runHandleEinspruch(dok: Dokument | undefined, modal: ModalController): void {
  if (!dok) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  modal.setEinspruchText(buildEinspruchSheetText(dok));
  modal.open('einspruch');
}

export async function runHandleMailTaslak(params: {
  dok: Dokument | undefined;
  openNotice: OpenNotice;
  onActionSessionStart?: (payload: ActionSessionPayload) => void;
  commitOutcome: CommitOutcomeFn;
}): Promise<void> {
  const { dok, openNotice, onActionSessionStart, commitOutcome } = params;
  const lang = getLangSync();
  if (!dok) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    await composeInstitutionMailWithAttachment(dok);
    onActionSessionStart?.({
      actionType: 'mail',
      title: t(lang, 'calendar.notice.mail_done_title'),
      message: t(lang, 'calendar.notice.mail_done_body'),
      onConfirm: () => commitOutcome('mail'),
    });
  } catch (e: unknown) {
    openNotice(t(lang, 'calendar.notice.mail_unavailable_title'), (e as Error)?.message || t(lang, 'calendar.notice.mail_unavailable_body'));
  }
}

export async function runHandlePDF(dok: Dokument | undefined, openNotice: OpenNotice): Promise<void> {
  const lang = getLangSync();
  if (!dok) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    await exportierePDF(dok);
  } catch (e) {
    if (e instanceof Error && e.message === 'BRIEFPILOT_PDF_TOO_SMALL') {
      openNotice(t(lang, 'calendar.notice.pdf_title'), t(lang, 'calendar.notice.pdf_too_small'));
    } else if (e instanceof Error && e.message === 'BRIEFPILOT_SHARING_UNAVAILABLE') {
      openNotice(t(lang, 'notice.share_unavailable.title'), t(lang, 'notice.share_unavailable.body'));
    } else {
      console.warn('[runHandlePDF]', e);
      openNotice(t(lang, 'calendar.notice.export_failed_title'), t(lang, 'calendar.notice.export_failed_body'));
    }
  }
}

export function runHandleErledigt(modal: ModalController): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  modal.open('erledigt');
}
