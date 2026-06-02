import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { downloadOcrResult } from '@/services/ocrMvpApi';
import * as Clipboard from 'expo-clipboard';
import { useT } from '@/hooks/useT';
import { useToast } from '@/hooks/useToast';
import PremiumToast from '@/design/components/PremiumToast';
import type { Dokument, StoreAction, StoreState } from '@/store';
import type { ActionSession } from '@/features/detail/hooks/useActionSessionManager';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import type { useDocumentActions } from '@/features/detail/hooks/useDocumentActions';

import ActionSimulatorModal from '@/components/ActionSimulatorModal';
import EditDocumentModal from '@/features/detail/modals/EditDocumentModal';
import AufgabenModal from '@/features/detail/modals/AufgabenModal';
import FormularModal from '@/features/detail/modals/FormularModal';
import ErledigtModal from '@/features/detail/modals/ErledigtModal';
import SicherTeilenModal from '@/features/detail/modals/SicherTeilenModal';
import YanıtSablonlariModal from '@/components/YanıtSablonlariModal';
import KurumlarRehberiModal from '@/components/KurumlarRehberiModal';
import BelgeAciklamaModal from '@/components/BelgeAciklamaModal';
import HilfeModal from '@/components/HilfeModal';
import BelgeChatModal from '@/components/BelgeChatModal';

import SignaturePdfSheet from '@/features/detail/modals/SignaturePdfSheet';

import ExportierenSheet from '@/features/detail/detail-modals/ExportierenSheet';
import PaymentPrepareSheet from '@/features/detail/detail-modals/PaymentPrepareSheet';
import ConfirmSheet from '@/features/detail/detail-modals/ConfirmSheet';
import NoticeSheet from '@/features/detail/detail-modals/NoticeSheet';
import OptionsSheet from '@/features/detail/detail-modals/OptionsSheet';
import EinspruchSheet from '@/features/detail/detail-modals/EinspruchSheet';
import LoeschenModal from '@/features/detail/modals/LoeschenModal';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types'; // re-exported for DetailActionsTab

export type { MoreMenuItem };

interface Props {
  modal: ModalController;
  dok: Dokument;
  dokId: string;
  state: StoreState;
  dispatch: (action: StoreAction) => void;
  actions: ReturnType<typeof useDocumentActions>;
  beginActionSession: (data: ActionSession) => void;
  router: { back: () => void };
  onOpenFullscreen?: () => void;
}

export default function DetailModalsContainer({
  modal, dok, dokId, state, dispatch, actions,
  beginActionSession, router, onOpenFullscreen,
}: Props) {
  const { config: toastConfig, show: showToast, hide: hideToast } = useToast();
  const pendingMarkRef   = useRef(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const deleteTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const { t: T } = useT();

  const handleExcelDownload = useCallback(async () => {
    if (!dok.ocrJobId) return;
    try {
      const filename = `briefpilot_${dok.titel?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'export'}.xlsx`;
      const uri = await downloadOcrResult(dok.ocrJobId, filename);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          UTI: 'com.microsoft.excel.xlsx',
        });
      }
    } catch (e: any) {
      Alert.alert(T('reply.excel.error'), e?.message ?? T('reply.excel.error.body'));
    }
  }, [dok.ocrJobId, dok.titel, T]);

  const handleCopyEinspruch = useCallback(async () => {
    await Clipboard.setStringAsync(modal.einspruchText || '');
    showToast({ message: 'Vorlage kopiert', tone: 'success', icon: 'checkmark-circle' });
  }, [modal, showToast]);

  const handleShareEinspruch = useCallback(async () => {
    if (!modal.einspruchText) return;
    const result = await Share.share({ message: modal.einspruchText, title: 'Einspruch' });
    if (result.action === Share.sharedAction) {
      showToast({ message: 'Einspruch geteilt', tone: 'success', icon: 'share-outline' });
    }
    beginActionSession({
      actionType: 'appeal',
      title: 'Einspruch fertiggestellt?',
      message: 'Wenn Sie den Einspruch versendet oder vorbereitet haben, speichern wir den Schritt direkt am Dokument.',
      onConfirm: () => actions.commitOutcome('appeal'),
    });
  }, [modal, beginActionSession, actions, showToast]);

  const handleOpenBankingApp = useCallback(async () => {
    const paymentData = modal.activeModal?.data;
    if (!paymentData?.onOpenBanking) return;

    const result = await paymentData.onOpenBanking();
    modal.close();

    if (result?.opened) {
      beginActionSession({
        actionType: 'pay',
        title: 'Zahlung abgeschlossen?',
        message: 'Sind Sie mit der Überweisung fertig? Dann markieren wir das Dokument direkt als erledigt.',
        onMarkPaid: paymentData.onMarkPaid,
      });
      return;
    }

    modal.open('notice', {
      title: 'Banking-App nicht gefunden',
      message: result?.copied
        ? 'Die Zahlungsdaten wurden kopiert. Öffnen Sie Ihre Banking-App manuell und fügen Sie die Daten dort ein.'
        : 'Es konnte keine Banking-App geöffnet werden.',
    });
  }, [modal, beginActionSession]);

  const handleDeleteConfirm = useCallback(() => {
    setPendingDelete(true);
    deleteTimerRef.current = setTimeout(() => {
      deleteTimerRef.current = null;
      setPendingDelete(false);
      dispatch({ type: 'DELETE_DOKUMENT', id: dokId });
      modal.close();
      router.back();
    }, 3000);
  }, [dispatch, dokId, modal, router]);

  const handleDeleteUndo = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setPendingDelete(false);
    modal.close();
  }, [modal]);

  return (
    <>
      <PremiumToast config={toastConfig} onHide={hideToast} />

      <ExportierenSheet
        visible={modal.isOpen('exportieren')}
        onClose={modal.close}
        onMail={() => void actions.handleMailTaslak()}
        onPDF={() => void actions.handlePDF()}
        onExcel={dok.ocrJobId ? () => void handleExcelDownload() : undefined}
        onOriginal={dok.uri ? () => void actions.handleOriginalTeilen() : undefined}
        onText={() => actions.handleTeilen(modal.anonModus)}
        onSicherLink={dok.v4DocId ? () => actions.handleGuvenliPaylasim() : undefined}
      />

      <LoeschenModal
        visible={modal.isOpen('loeschen')}
        onClose={modal.close}
        onConfirm={handleDeleteConfirm}
        phase={pendingDelete ? 'pending' : 'confirm'}
        onUndo={handleDeleteUndo}
      />

      <PaymentPrepareSheet
        visible={modal.isOpen('payment')}
        onClose={modal.close}
        data={modal.activeModal?.data}
        onOpenBankingApp={handleOpenBankingApp}
      />

      <ConfirmSheet
        visible={modal.isOpen('confirm')}
        onClose={modal.close}
        data={modal.activeModal?.data}
      />

      <NoticeSheet
        visible={modal.isOpen('notice')}
        onClose={modal.close}
        data={modal.activeModal?.data}
      />

      <OptionsSheet
        visible={modal.isOpen('options')}
        onClose={modal.close}
        data={modal.activeModal?.data}
      />

      <EinspruchSheet
        visible={modal.isOpen('einspruch')}
        onClose={modal.close}
        einspruchText={modal.einspruchText || ''}
        onCopy={handleCopyEinspruch}
        onShare={handleShareEinspruch}
      />

      <ActionSimulatorModal
        visible={modal.isOpen('simulator')}
        onClose={modal.close}
        dok={dok}
      />

      <EditDocumentModal
        visible={modal.isOpen('edit')}
        onClose={modal.close}
        onSave={actions.handleEditSpeichern}
        state={state}
        modal={modal}
      />

      <AufgabenModal
        visible={modal.isOpen('aufgaben')}
        onClose={modal.close}
        onAdd={() => actions.handleAufgabeHinzufuegen(modal, dokId, dispatch)}
        modal={modal}
      />

      <FormularModal
        visible={modal.isOpen('formular')}
        onClose={modal.close}
        onCopyWiderspruch={async () => { await actions.handleFormularCopyWiderspruch?.(); modal.close(); }}
        onMailWiderspruch={async () => { await actions.handleFormularMailWiderspruch?.(); modal.close(); }}
        onCopyPayment={async () => { await actions.handleFormularCopyPayment?.(); modal.close(); }}
      />

      <ErledigtModal
        visible={modal.isOpen('erledigt')}
        onClose={() => {
          const shouldBack = pendingMarkRef.current;
          pendingMarkRef.current = false;
          modal.close();
          if (shouldBack) router.back();
        }}
        erledigt={dok?.erledigt}
        betrag={dok?.betrag as number | null}
        onConfirm={() => {
          if (dok?.erledigt) {
            dispatch({ type: 'UNMARK_ERLEDIGT', id: dokId });
          } else {
            pendingMarkRef.current = true;
            dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
          }
        }}
        onUndo={() => {
          pendingMarkRef.current = false;
          dispatch({ type: 'UNMARK_ERLEDIGT', id: dokId });
        }}
      />

      <SicherTeilenModal
        visible={modal.isOpen('sicherTeilen')}
        onClose={modal.close}
        dok={dok}
        onSelectTTL={(ttl: string) => actions.handleSicherTeilenMitTTL(ttl)}
      />

      <YanıtSablonlariModal
        visible={modal.isOpen('yanitSablon')}
        onClose={modal.close}
        dok={dok}
      />

      <KurumlarRehberiModal
        visible={modal.isOpen('kurumlar')}
        onClose={modal.close}
        dokTyp={dok?.typ}
      />

      <BelgeAciklamaModal
        visible={modal.isOpen('aciklama')}
        onClose={modal.close}
        dok={dok}
      />

      <HilfeModal
        visible={modal.isOpen('hilfe')}
        onClose={modal.close}
        dokTyp={dok?.typ}
      />

      <BelgeChatModal
        visible={modal.isOpen('chat')}
        onClose={modal.close}
        dok={dok}
      />

      <SignaturePdfSheet
        visible={modal.isOpen('signatur')}
        onClose={modal.close}
        dok={dok}
        onDone={(signedUri) => {
          dispatch({
            type: 'UPDATE_DOKUMENT',
            payload: {
              id: dokId,
              uri: signedUri,
              fileRelativePath: null,
              // keep original so user can revert
              unsignedUri: dok.unsignedUri ?? dok.uri,
            },
          });
          showToast({
            message: 'PDF unterschrieben und gespeichert',
            tone: 'success',
            icon: 'checkmark-circle',
          });
          onOpenFullscreen?.();
        }}
      />
    </>
  );
}
