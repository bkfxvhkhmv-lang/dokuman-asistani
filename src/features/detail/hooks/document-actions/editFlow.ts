import * as Haptics from 'expo-haptics';
import type { Dokument, StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import { erkenneLernvorschlag } from '@/utils';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';
import { postCorrectionEvent } from '@/services/ocrMvpApi';
import { humanizeTitle } from '@/utils/displaySanitizer';
import {
  formatAmountForEditInput,
  formatIsoToGermanDate,
  parseAmountForStore,
  parseGermanDateInput,
} from '@/utils/germanInputFormat';
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
  // Prefill with user customTitle when set; titel is system/OCR and not edited directly.
  const displayForEdit =
    dok.customTitle?.trim()
    || humanizeTitle(dok.titel)
    || dok.titel
    || '';
  modal.setEditTitel(displayForEdit);
  modal.setEditAbsender(dok.absender || '');
  modal.setEditBetrag(dok.betrag != null ? formatAmountForEditInput(dok.betrag) : '');
  modal.setEditFrist(dok.frist ? formatIsoToGermanDate(dok.frist) : '');
  modal.setEditDokumentDatum(dok.dokumentDatum ? formatIsoToGermanDate(dok.dokumentDatum) : '');
  modal.setEditIban(dok.iban || '');
  modal.setEditZahlungszweck(dok.zahlungszweck || '');
  modal.setEditAktenzeichen(dok.aktenzeichen || '');
  modal.setEditKundennr(dok.kundennr || '');
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

  const betragNum = modal.editBetrag ? parseAmountForStore(modal.editBetrag) : null;
  const fristYmd = modal.editFrist ? parseGermanDateInput(modal.editFrist) : null;
  const fristVal = fristYmd ? new Date(fristYmd).toISOString() : null;
  const fristGeaendert =
    String(fristVal ?? '') !== String(dok.frist ?? '');

  const dokumentDatumYmd = modal.editDokumentDatum
    ? parseGermanDateInput(modal.editDokumentDatum)
    : null;
  const dokumentDatumVal = dokumentDatumYmd
    ? new Date(dokumentDatumYmd).toISOString()
    : dok.dokumentDatum ?? null;

  const editedTitle = modal.editTitel.trim();

  const neueFelder: Partial<Dokument> & { id: string } = {
    id: dokId,
    typ: normalizeDocumentTyp(modal.editTyp),
    risiko: modal.editRisiko as Dokument['risiko'],
    customTitle: editedTitle || null,
    absender: modal.editAbsender.trim() || dok.absender,
    betrag: betragNum !== null && !isNaN(betragNum) ? betragNum : dok.betrag,
    frist: fristVal,
    dokumentDatum: dokumentDatumVal,
    iban: modal.editIban.trim() || dok.iban || null,
    zahlungszweck: modal.editZahlungszweck.trim() || dok.zahlungszweck || null,
    aktenzeichen: modal.editAktenzeichen.trim() || dok.aktenzeichen || null,
    kundennr: modal.editKundennr.trim() || dok.kundennr || null,
    profilId: modal.editProfilId,
    userOrdner: modal.editUserOrdner.trim() ? modal.editUserOrdner.trim() : null,
    ...(fristGeaendert ? { fristImKalender: false } : {}),
  };

  dispatch({ type: 'UPDATE_DOKUMENT', payload: neueFelder });
  modal.close();

  // Learning loop: fire correction events for changed OCR fields (Speichern only)
  if (dok.ocrJobId) {
    const corrections: Array<[string, unknown, unknown]> = [
      ['title',         dok.customTitle ?? dok.titel, neueFelder.customTitle ?? dok.titel],
      ['sender',        dok.absender, neueFelder.absender],
      ['amount',        dok.betrag,   neueFelder.betrag],
      ['due_date',      dok.frist,    neueFelder.frist],
      ['document_type', dok.typ,      neueFelder.typ],
    ];
    for (const [field_key, old_value, new_value] of corrections) {
      if (String(old_value ?? '') !== String(new_value ?? '')) {
        void postCorrectionEvent(dok.ocrJobId, {
          field_key,
          old_value,
          new_value,
          source: 'user_edit',
          screen: 'detail_edit_modal',
        }).catch(e => console.warn('[learning] correction event failed', e));
      }
    }
  }

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
