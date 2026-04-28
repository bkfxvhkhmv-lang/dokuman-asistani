import { useCallback } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Contacts from 'expo-contacts';
import {
  addToCalendar,
  shareDokument,
  exportierePDF,
  anonymisiereText,
  erkenneLernvorschlag,
} from '../../../utils';
import {
  copyFormToClipboard,
  openMailWithForm,
  prefillPaymentForm,
} from '../../../services/formFillerService';
import {
  buildPaymentSheetData,
  buildEinspruchSheetText,
  composeInstitutionMailWithAttachment,
  composePartnerPaymentNotice,
} from '../services/documentActionFlows';
import { applyActionOutcome, createActionOutcome } from '../services/actionEngine';
import type { Dokument, StoreAction, StoreState } from '../../../store';
import type { ModalController } from './useModalController';

interface ActionSessionPayload {
  actionType: string;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface UseDocumentActionsParams {
  dok: Dokument | undefined;
  dokId: string;
  dispatch: (action: StoreAction) => void;
  modal: ModalController;
  state: StoreState;
  router: { back: () => void };
  onActionSessionStart?: (payload: ActionSessionPayload) => void;
}

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    openConfirm('Dokument löschen', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          // Save snapshot for 3-second undo window
          const snapshot = { ...dok };
          dispatch({ type: 'DELETE_DOKUMENT', id: dokId });

          // Navigate back immediately — optimistic
          router.back();

          // Undo window: if user triggers undo before timer fires, restore
          let undone = false;
          const undoTimer = setTimeout(() => {
            if (!undone) { /* permanent — nothing to do */ }
          }, 3000);

          // Expose undo on the router state so a toast could call it
          // (called via modal.open('undo') pattern — simplest available channel)
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
  }, [dispatch, dok, dokId, modal, openConfirm, router]);

  const handleZahlen = useCallback(() => {
    if (!dok) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    modal.open('payment', buildPaymentSheetData(dok, {
      onMarkPaid: () => {
        dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
        commitOutcome('pay');
        router.back();
      },
    }) as any);
  }, [commitOutcome, dispatch, dok, dokId, modal, router]);

  const handleZahlenMitPartner = useCallback(() => {
    if (!dok) return;
    const partnerEmail = state.einstellungen?.partnerEmail;
    modal.open('payment', buildPaymentSheetData(dok, {
      partnerEmail: (partnerEmail || null) as null | undefined,
      onMarkPaid: async () => {
        dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
        await composePartnerPaymentNotice(dok, partnerEmail);
        commitOutcome('pay', {
          timeline: partnerEmail ? 'Heute bezahlt und Partner informiert' : 'Heute bezahlt',
        });
        router.back();
      },
    }) as any);
  }, [commitOutcome, dispatch, dok, dokId, modal, router, state]);

  const handleEinspruch = useCallback(() => {
    if (!dok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    modal.setEinspruchText(buildEinspruchSheetText(dok));
    modal.open('einspruch');
  }, [dok, modal]);

  const handleKalender = useCallback(async () => {
    if (!dok?.frist) {
      openNotice('Kein Datum', 'Dieses Dokument hat kein Fälligkeitsdatum.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await addToCalendar(dok);
    if (ok) openNotice('Kalender aktualisiert', 'Termin in Ihren Kalender eingetragen.');
  }, [dok, openNotice]);

  const handleTeilen = useCallback((anonModus: boolean) => {
    if (!dok) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (anonModus) {
      shareDokument(anonymisiereText(dok) as unknown as import('../../../store').Dokument);
    } else {
      shareDokument(dok);
    }
  }, [dok]);

  const handleOriginalTeilen = useCallback(async () => {
    if (!dok?.v4DocId) {
      openNotice('Nicht verfügbar', 'Noch nicht synchronisiert.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { shareOriginalFile } = await import('../../../services/v4Api');
      await shareOriginalFile(dok.v4DocId, dok.dateiName || `${dok.titel}.pdf`);
    } catch (e: unknown) {
      openNotice('Fehler', (e as Error).message || 'Datei konnte nicht geteilt werden.');
    }
  }, [dok, openNotice]);

  const handleGuvenliPaylasim = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    modal.open('sicherTeilen');
  }, [modal]);

  const handleSicherTeilenMitTTL = useCallback(async (ttl: string) => {
    if (!dok?.v4DocId) {
      openNotice('Nicht verfügbar', 'Dieses Dokument wurde noch nicht mit V4 synchronisiert.');
      return;
    }
    try {
      const { createShareLink } = await import('../../../services/v4Api');
      const res = await createShareLink(dok.v4DocId, ttl);
      if (!res?.share_url) throw new Error('Es wurde kein Freigabelink zurückgegeben.');
      await Clipboard.setStringAsync(res.share_url);
      await Share.share({
        message: `${dok.titel}\n\nBriefPilot Sicherer Link:\n${res.share_url}\n\nGültigkeit: ${ttl}`,
        title: dok.titel,
      });
      modal.close();
    } catch (e: unknown) {
      console.error('[SicherTeilen]', e);
      openNotice('Fehler', (e as Error)?.message || 'Link konnte nicht erstellt werden.');
    }
  }, [dok, modal, openNotice]);

  const handleMailTaslak = useCallback(async () => {
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
  }, [commitOutcome, dok, onActionSessionStart, openNotice]);

  const handlePDF = useCallback(async () => {
    if (!dok) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await exportierePDF(dok);
  }, [dok]);

  const handleErledigt = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    modal.open('erledigt');
  }, [modal]);

  const handleEdit = useCallback(() => {
    if (!dok) return;
    modal.setEditTyp(dok.typ);
    modal.setEditRisiko(dok.risiko);
    modal.setEditTitel(dok.titel || '');
    modal.setEditAbsender(dok.absender || '');
    modal.setEditBetrag(dok.betrag ? String(dok.betrag) : '');
    modal.setEditFrist(dok.frist ? dok.frist.slice(0, 10) : '');
    modal.setEditTab('info');
    modal.setEditProfilId(dok.profilId || null);
    modal.open('edit');
  }, [dok, modal]);

  const handleEditSpeichern = useCallback(() => {
    if (!dok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const betragNum = modal.editBetrag ? parseFloat(modal.editBetrag.replace(',', '.')) : null;
    const fristVal  = modal.editFrist  ? new Date(modal.editFrist).toISOString() : null;

    const neueFelder = {
      id: dokId,
      typ: modal.editTyp,
      risiko: modal.editRisiko as Dokument['risiko'],
      titel: modal.editTitel.trim() || dok.titel,
      absender: modal.editAbsender.trim() || dok.absender,
      betrag: betragNum !== null && !isNaN(betragNum) ? betragNum : dok.betrag,
      frist: fristVal,
      profilId: modal.editProfilId,
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
  }, [dok, dokId, dispatch, modal, openConfirm]);

  const handleFormularAusfuellen = useCallback(() => {}, []);

  const handleFormularCopyWiderspruch = useCallback(async () => {
    if (!dok) return;
    await copyFormToClipboard(dok);
    openNotice('Kopiert', 'Widerspruch-Vorlage wurde in die Zwischenablage kopiert.');
  }, [dok, openNotice]);

  const handleFormularMailWiderspruch = useCallback(async () => {
    if (!dok) return;
    try {
      await openMailWithForm(dok);
    } catch (e: unknown) {
      openNotice('Fehler', (e as Error).message);
    }
  }, [dok, openNotice]);

  const handleFormularCopyPayment = useCallback(async () => {
    if (!dok) return;
    const pf = prefillPaymentForm(dok);
    await Clipboard.setStringAsync(
      `Empfänger: ${pf.empfaenger}\nIBAN: ${pf.iban}\nBetrag: ${pf.betrag}\nVerwendung: ${pf.verwendung}`
    );
    openNotice('Kopiert', 'Zahlungsdaten wurden kopiert.');
  }, [dok, openNotice]);

  const handleKontaktVerknuepfen = useCallback(
    async (setKontaktName: (name: string) => void) => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        openNotice('Kein Zugriff', 'Bitte erlauben Sie den Kontaktzugriff.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name] });
      if (!data.length) {
        openNotice('Keine Kontakte', 'Ihr Adressbuch ist leer.');
        return;
      }
      const options = data.slice(0, 20).map(c => ({
        text: c.name ?? '',
        onPress: () => {
          setKontaktName(c.name ?? '');
          dispatch({ type: 'UPDATE_DOKUMENT', payload: { id: dokId, kontaktName: c.name } });
        },
      }));
      options.push({ text: 'Abbrechen', onPress: () => {} });
      openOptions('Kontakt verknüpfen', 'Wählen Sie einen Kontakt:', options);
    },
    [dispatch, dokId, openNotice, openOptions]
  );

  const handleAufgabeHinzufuegen = useCallback(
    (modalArg: ModalController, dokIdArg: string, dispatchArg: (action: StoreAction) => void) => {
      if (!modalArg.neueAufgabeTitel.trim()) return;
      dispatchArg({
        type: 'ADD_AUFGABE',
        dokId: dokIdArg,
        payload: {
          id: Date.now().toString(36),
          titel: modalArg.neueAufgabeTitel.trim(),
          faellig: modalArg.neueAufgabeFrist || null,
          verantwortlich: modalArg.neueAufgabeVerantwortlich.trim() || null,
          erledigt: false,
          datum: new Date().toISOString(),
        } as any,
      });
      modalArg.setNeueAufgabeTitel('');
      modalArg.setNeueAufgabeFrist('');
      modalArg.setNeueAufgabeVerantwortlich('');
      modalArg.close();
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
    handleEditSpeichern,
    handleFormularAusfuellen,
    handleFormularCopyWiderspruch,
    handleFormularMailWiderspruch,
    handleFormularCopyPayment,
    handleKontaktVerknuepfen,
    handleAufgabeHinzufuegen,
  };
}
