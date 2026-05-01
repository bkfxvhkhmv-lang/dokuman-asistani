import { useCallback } from 'react';
import { applyActionOutcome, createActionOutcome } from '@/features/detail/services/actionEngine';
import type { StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';

import { runHandleLoeschen } from './document-actions/deletion';
import { runHandleZahlen, runHandleZahlenMitPartner } from './document-actions/payment';
import {
  runHandleGuvenliPaylasim,
  runHandleOriginalTeilen,
  runHandleSicherTeilenMitTTL,
  runHandleTeilen,
} from './document-actions/sharing';
import {
  runHandleEinspruch,
  runHandleErledigt,
  runHandleKalender,
  runHandleMailTaslak,
  runHandlePDF,
} from './document-actions/calendarAndAppeals';
import { runHandleEdit, runHandleEditSpeichern } from './document-actions/editFlow';
import {
  runAufgabeHinzufuegen,
  runFormularCopyPayment,
  runFormularCopyWiderspruch,
  runFormularMailWiderspruch,
  runKontaktVerknuepfen,
} from './document-actions/formsAndContacts';
import type { ActionSessionPayload, UseDocumentActionsParams } from './document-actions/types';

export type { ActionSessionPayload, UseDocumentActionsParams } from './document-actions/types';

export function useDocumentActions({
  dok,
  dokId,
  dispatch,
  modal,
  state,
  router,
  onActionSessionStart,
}: UseDocumentActionsParams) {
  const commitOutcome = useCallback((key: string, overrides: Record<string, unknown> = {}) => {
    const outcome = createActionOutcome(key, overrides);
    applyActionOutcome(dispatch, dokId, outcome);
    return outcome;
  }, [dispatch, dokId]);

  const openNotice = useCallback((title: string, message: string) => {
    modal.open('notice', { title, message });
  }, [modal]);

  const openConfirm = useCallback((title: string, message: string, actions: Array<{ text: string; style?: string; onPress?: () => void }> = []) => {
    modal.open('confirm', { title, message, actions });
  }, [modal]);

  const openOptions = useCallback((title: string, message: string, options: Array<{ text: string; style?: string; onPress?: () => void }> = []) => {
    modal.open('options', { title, message, options });
  }, [modal]);

  const handleLoeschen = useCallback(() => {
    if (!dok) return;
    modal.open('loeschen');
  }, [dok, modal]);

  const handleZahlen = useCallback(() => {
    runHandleZahlen({ dok, dokId, dispatch, modal, router, commitOutcome });
  }, [commitOutcome, dispatch, dok, dokId, modal, router]);

  const handleZahlenMitPartner = useCallback(() => {
    runHandleZahlenMitPartner({
      dok,
      dokId,
      partnerEmail: state.einstellungen?.partnerEmail,
      dispatch,
      modal,
      router,
      commitOutcome,
    });
  }, [commitOutcome, dispatch, dok, dokId, modal, router, state.einstellungen?.partnerEmail]);

  const handleEinspruch = useCallback(() => {
    runHandleEinspruch(dok, modal);
  }, [dok, modal]);

  const handleKalender = useCallback(async () => {
    await runHandleKalender({ dok, openNotice, dispatch, dokId });
  }, [dok, dokId, dispatch, openNotice]);

  const handleTeilen = useCallback((anonModus: boolean) => {
    runHandleTeilen(dok, anonModus);
  }, [dok]);

  const handleOriginalTeilen = useCallback(async () => {
    await runHandleOriginalTeilen({ dok, openNotice });
  }, [dok, openNotice]);

  const handleGuvenliPaylasim = useCallback(() => {
    runHandleGuvenliPaylasim(modal);
  }, [modal]);

  const handleSicherTeilenMitTTL = useCallback(async (ttl: string) => {
    await runHandleSicherTeilenMitTTL({ dok, ttl, modal, openNotice });
  }, [dok, modal, openNotice]);

  const handleMailTaslak = useCallback(async () => {
    await runHandleMailTaslak({ dok, openNotice, onActionSessionStart, commitOutcome });
  }, [commitOutcome, dok, onActionSessionStart, openNotice]);

  const handlePDF = useCallback(async () => {
    await runHandlePDF(dok);
  }, [dok]);

  const handleErledigt = useCallback(() => {
    runHandleErledigt(modal);
  }, [modal]);

  const handleEdit = useCallback(() => {
    runHandleEdit(dok, modal);
  }, [dok, modal]);

  const handleEditKlassifikation = useCallback(() => {
    runHandleEdit(dok, modal, { tab: 'klassif' });
  }, [dok, modal]);

  const handleEditSpeichern = useCallback(() => {
    runHandleEditSpeichern({ dok, dokId, dispatch, modal, openConfirm });
  }, [dok, dokId, dispatch, modal, openConfirm]);

  const handleFormularAusfuellen = useCallback(() => {}, []);

  const handleFormularCopyWiderspruch = useCallback(async () => {
    await runFormularCopyWiderspruch(dok, openNotice);
  }, [dok, openNotice]);

  const handleFormularMailWiderspruch = useCallback(async () => {
    await runFormularMailWiderspruch(dok, openNotice);
  }, [dok, openNotice]);

  const handleFormularCopyPayment = useCallback(async () => {
    await runFormularCopyPayment(dok, openNotice);
  }, [dok, openNotice]);

  const handleKontaktVerknuepfen = useCallback(
    async (setKontaktName: (name: string) => void) => {
      await runKontaktVerknuepfen({
        dokId,
        dispatch,
        setKontaktName,
        openNotice,
        openOptions,
      });
    },
    [dispatch, dokId, openNotice, openOptions]
  );

  const handleAufgabeHinzufuegen = useCallback(
    (modalArg: ModalController, dokIdArg: string, dispatchArg: (action: StoreAction) => void) => {
      runAufgabeHinzufuegen(modalArg, dokIdArg, dispatchArg);
    },
    []
  );

  return {
    commitOutcome,
    handleLoeschen,
    handleZahlen,
    handleZahlenMitPartner,
    handleEinspruch,
    handleKalender,
    handleTeilen,
    handleOriginalTeilen,
    handleGuvenliPaylasim,
    handleSicherTeilenMitTTL,
    handleMailTaslak,
    handlePDF,
    handleErledigt,
    handleEdit,
    handleEditKlassifikation,
    handleEditSpeichern,
    handleFormularAusfuellen,
    handleFormularCopyWiderspruch,
    handleFormularMailWiderspruch,
    handleFormularCopyPayment,
    handleKontaktVerknuepfen,
    handleAufgabeHinzufuegen,
  };
}
