import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export interface ActionSession {
  expectedReturn?: boolean;
  actionType?: string;
  title?: string;
  message?: string;
  onMarkPaid?: () => void;
  onConfirm?: () => void;
}

interface UseActionSessionManagerResult {
  beginActionSession: (session: ActionSession) => void;
}

export function useActionSessionManager(
  openConfirmModal: (data: {
    title: string;
    message: string;
    actions: { text: string; style?: string; onPress?: () => void }[];
  }) => void
): UseActionSessionManagerResult {
  const [pendingSession, setPendingSession] = useState<ActionSession | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const beginActionSession = (session: ActionSession) => {
    setPendingSession({ expectedReturn: true, ...session });
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        pendingSession?.expectedReturn &&
        /inactive|background/.test(prevState) &&
        nextState === 'active'
      ) {
        const session = pendingSession;
        setPendingSession(null);
        openConfirmModal({
          title: session.title || 'Aktion abgeschlossen?',
          message: session.message || 'Möchten Sie diesen Schritt am Dokument speichern?',
          actions: [
            { text: 'Noch nicht', style: 'cancel' },
            {
              text: session.actionType === 'pay' ? 'Ja, erledigt' : 'Ja, speichern',
              onPress: () => {
                if (session.actionType === 'pay') session.onMarkPaid?.();
                else session.onConfirm?.();
              },
            },
          ],
        });
      }
    });

    return () => sub.remove();
  }, [pendingSession, openConfirmModal]);

  return { beginActionSession };
}
