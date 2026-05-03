import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Dokument } from '@/store';
import type { StoreAction } from '@/store/actions';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import {
  buildEinspruchSheetText,
  composeInstitutionMailWithAttachment,
} from '@/features/detail/services/documentActionFlows';
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
  if (!dok?.frist) {
    openNotice('Kein Datum', 'Dieses Dokument hat kein Fälligkeitsdatum.');
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const ok = await addToCalendar(dok);
  if (!ok) {
    openNotice('Kalender', 'Zugriff verweigert oder kein beschreibbarer Kalender gefunden.');
    return;
  }
  if (dispatch && dokId) {
    dispatch({ type: 'UPDATE_DOKUMENT', payload: { id: dokId, fristImKalender: true } });
  }
  await scheduleFristLocalNotifications({ ...dok, fristImKalender: true });
  openNotice('Kalender & Erinnerungen', 'Termin eingetragen. Lokale Hinweise wurden geplant.');
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
  if (!dok) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    await composeInstitutionMailWithAttachment(dok);
    onActionSessionStart?.({
      actionType: 'mail',
      title: 'E-Mail fertiggestellt?',
      message: 'Wenn Sie den Entwurf fertig bearbeitet oder gesendet haben, markieren wir diesen Schritt direkt.',
      onConfirm: () => commitOutcome('mail'),
    });
  } catch (e: unknown) {
    openNotice('E-Mail nicht verfügbar', (e as Error)?.message || 'Bitte richten Sie eine E-Mail-App ein.');
  }
}

export async function runHandlePDF(dok: Dokument | undefined): Promise<void> {
  if (!dok) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    await exportierePDF(dok);
  } catch (e) {
    if (e instanceof Error && e.message === 'BRIEFPILOT_PDF_TOO_SMALL') {
      Alert.alert('PDF', 'Die Datei wirkt leer oder zu klein. Bitte erneut versuchen.');
    } else if (e instanceof Error && e.message === 'BRIEFPILOT_SHARING_UNAVAILABLE') {
      Alert.alert('Teilen nicht verfügbar', 'Die Datei wurde erstellt, kann auf diesem Gerät aber gerade nicht geteilt werden.');
    } else {
      console.warn('[runHandlePDF]', e);
      Alert.alert('Export fehlgeschlagen', 'Bitte versuche es erneut.');
    }
  }
}

export function runHandleErledigt(modal: ModalController): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  modal.open('erledigt');
}
