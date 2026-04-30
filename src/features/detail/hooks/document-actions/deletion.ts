import * as Haptics from 'expo-haptics';
import type { Dokument, StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';

type OpenConfirm = (title: string, message: string, actions?: Array<{ text: string; style?: string; onPress?: () => void; autoDismissMs?: number }>) => void;

export function runHandleLoeschen(params: {
  dok: Dokument | undefined;
  dokId: string;
  dispatch: (action: StoreAction) => void;
  modal: ModalController;
  router: { back: () => void };
  openConfirm: OpenConfirm;
}): void {
  const { dok, dokId, dispatch, modal, router, openConfirm } = params;
  if (!dok) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  openConfirm('Dokument löschen', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
    { text: 'Abbrechen', style: 'cancel' },
    {
      text: 'Löschen',
      style: 'destructive',
      onPress: () => {
        const snapshot = { ...dok };
        dispatch({ type: 'DELETE_DOKUMENT', id: dokId });
        router.back();

        let undone = false;
        const undoTimer = setTimeout(() => {
          if (!undone) { /* permanent */ }
        }, 3000);

        modal.open('confirm', {
          title:   'Dokument gelöscht',
          message: 'Tippe auf Rückgängig, um es wiederherzustellen.',
          actions: [
            {
              text: 'Rückgängig',
              onPress: () => {
                undone = true;
                clearTimeout(undoTimer);
                dispatch({ type: 'ADD_DOKUMENT', payload: snapshot });
              },
            },
            { text: 'OK', style: 'cancel' },
          ],
          autoDismissMs: 3000,
        } as any);
      },
    },
  ]);
}
