import * as Haptics from 'expo-haptics';
import type { Dokument, StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import { erkenneLernvorschlag } from '@/utils';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';

type OpenConfirm = (
  title: string,
  message: string,
  actions?: Array<{ text: string; style?: string; onPress?: () => void }>
) => void;

export function runHandleEdit(
  dok: Dokument | undefined,
  modal: ModalController,
  opts?: { tab?: 'info' | 'klassif' },
): void {
  if (!dok) return;
  modal.setEditTyp(dok.typ);
  modal.setEditRisiko(dok.risiko);
  modal.setEditTitel(dok.titel || '');
  modal.setEditAbsender(dok.absender || '');
  modal.setEditBetrag(dok.betrag ? String(dok.betrag) : '');
  modal.setEditFrist(dok.frist ? dok.frist.slice(0, 10) : '');
  modal.setEditTab(opts?.tab ?? 'info');
  modal.setEditProfilId(dok.profilId || null);
  modal.setEditUserOrdner(dok.userOrdner ?? '');
  modal.open('edit');
}

export function runHandleEditSpeichern(params: {
  dok: Dokument | undefined;
  dokId: string;
  dispatch: (action: StoreAction) => void;
  modal: ModalController;
  openConfirm: OpenConfirm;
}): void {
  const { dok, dokId, dispatch, modal, openConfirm } = params;
  if (!dok) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  const betragNum = modal.editBetrag ? parseFloat(modal.editBetrag.replace(',', '.')) : null;
  const fristVal = modal.editFrist ? new Date(modal.editFrist).toISOString() : null;
  const fristGeaendert =
    String(fristVal ?? '') !== String(dok.frist ?? '');

  const neueFelder: Partial<Dokument> & { id: string } = {
    id: dokId,
    typ: normalizeDocumentTyp(modal.editTyp),
    risiko: modal.editRisiko as Dokument['risiko'],
    titel: modal.editTitel.trim() || dok.titel,
    absender: modal.editAbsender.trim() || dok.absender,
    betrag: betragNum !== null && !isNaN(betragNum) ? betragNum : dok.betrag,
    frist: fristVal,
    profilId: modal.editProfilId,
    userOrdner: modal.editUserOrdner.trim() ? modal.editUserOrdner.trim() : null,
    ...(fristGeaendert ? { fristImKalender: false } : {}),
  };

  dispatch({ type: 'UPDATE_DOKUMENT', payload: neueFelder });
  modal.close();

  const vorschlag = erkenneLernvorschlag(dok, neueFelder);
  if (vorschlag) {
    setTimeout(() => {
      openConfirm('Lernregel speichern?', `"${vorschlag.label}"`, [
        { text: 'Nicht speichern', style: 'cancel' },
        {
          text: 'Regel speichern',
          onPress: () => dispatch({ type: 'ADD_LERN_REGEL', payload: vorschlag as any }),
        },
      ]);
    }, 400);
  }
}
