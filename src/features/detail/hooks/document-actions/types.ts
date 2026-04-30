import type { Dokument, StoreAction, StoreState } from '@/store';
import type { ActionOutcome } from '@/features/detail/services/actionEngine';
import type { ModalController } from '@/features/detail/hooks/useModalController';

export interface ActionSessionPayload {
  actionType: string;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface UseDocumentActionsParams {
  dok: Dokument | undefined;
  dokId: string;
  dispatch: (action: StoreAction) => void;
  modal: ModalController;
  state: StoreState;
  router: { back: () => void };
  onActionSessionStart?: (payload: ActionSessionPayload) => void;
}

export type ModalOpeners = {
  openNotice: (title: string, message: string) => void;
  openConfirm: (title: string, message: string, actions?: Array<{ text: string; style?: string; onPress?: () => void }>) => void;
  openOptions: (title: string, message: string, options?: Array<{ text: string; style?: string; onPress?: () => void }>) => void;
};

export type CommitOutcomeFn = (key: string, overrides?: Record<string, unknown>) => ActionOutcome | null;
