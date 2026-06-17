import type { Dokument } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import { runHandleEdit, runHandleEditSpeichern } from '@/features/detail/hooks/document-actions/editFlow';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/services/ocrMvpApi', () => ({
  postCorrectionEvent: jest.fn(),
}));

jest.mock('@/utils', () => ({
  erkenneLernvorschlag: jest.fn(() => null),
}));

function makeDok(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'doc-1',
    titel: 'Sonstiges — Unbekannt',
    typ: 'Sonstiges',
    absender: 'Unbekannt',
    risiko: 'niedrig',
    confidence: 80,
    createdAt: '2026-06-17T10:00:00.000Z',
    ...overrides,
  } as Dokument;
}

function makeModal(overrides: Partial<ModalController> = {}): ModalController {
  const state = {
    editTitel: '',
    editTyp: 'Sonstiges',
    editRisiko: 'niedrig',
    editAbsender: '',
    editBetrag: '',
    editFrist: '',
    editDokumentDatum: '',
    editIban: '',
    editZahlungszweck: '',
    editAktenzeichen: '',
    editKundennr: '',
    editTab: 'info' as const,
    editProfilId: null,
    editUserOrdner: '',
    setEditTitel: jest.fn((v: string) => { state.editTitel = v; }),
    setEditTyp: jest.fn((v: string) => { state.editTyp = v; }),
    setEditRisiko: jest.fn((v: string) => { state.editRisiko = v; }),
    setEditAbsender: jest.fn((v: string) => { state.editAbsender = v; }),
    setEditBetrag: jest.fn((v: string) => { state.editBetrag = v; }),
    setEditFrist: jest.fn((v: string) => { state.editFrist = v; }),
    setEditDokumentDatum: jest.fn((v: string) => { state.editDokumentDatum = v; }),
    setEditIban: jest.fn((v: string) => { state.editIban = v; }),
    setEditZahlungszweck: jest.fn((v: string) => { state.editZahlungszweck = v; }),
    setEditAktenzeichen: jest.fn((v: string) => { state.editAktenzeichen = v; }),
    setEditKundennr: jest.fn((v: string) => { state.editKundennr = v; }),
    setEditTab: jest.fn((v: 'info' | 'klassif') => { state.editTab = v; }),
    setEditProfilId: jest.fn((v: string | null) => { state.editProfilId = v; }),
    setEditUserOrdner: jest.fn((v: string) => { state.editUserOrdner = v; }),
    open: jest.fn(),
    close: jest.fn(),
    ...overrides,
  };
  return state as unknown as ModalController;
}

describe('editFlow — customTitle (#142A)', () => {
  it('prefill uses customTitle when set', () => {
    const dok = makeDok({ customTitle: 'Meine Rechnung', titel: 'Sonstiges — Unbekannt' });
    const modal = makeModal();
    runHandleEdit(dok, modal);
    expect(modal.setEditTitel).toHaveBeenCalledWith('Meine Rechnung');
  });

  it('save sets customTitle and preserves titel', () => {
    const dok = makeDok({ titel: 'Sonstiges — Unbekannt', customTitle: null });
    const modal = makeModal();
    modal.editTitel = 'Benutzer Titel';

    const dispatch = jest.fn();
    runHandleEditSpeichern({
      dok,
      dokId: dok.id,
      dispatch,
      modal,
      openConfirm: jest.fn(),
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_DOKUMENT',
      payload: expect.objectContaining({
        id: dok.id,
        customTitle: 'Benutzer Titel',
      }),
    });

    const payload = dispatch.mock.calls[0][0].payload;
    expect(payload.titel).toBeUndefined();
    expect(payload.customTitle).toBe('Benutzer Titel');
  });

  it('does not overwrite existing customTitle when user saves unchanged value', () => {
    const dok = makeDok({
      titel: 'Sonstiges — Unbekannt',
      customTitle: 'Bestehender Titel',
    });
    const modal = makeModal();
    modal.editTitel = 'Bestehender Titel';

    const dispatch = jest.fn();
    runHandleEditSpeichern({
      dok,
      dokId: dok.id,
      dispatch,
      modal,
      openConfirm: jest.fn(),
    });

    const payload = dispatch.mock.calls[0][0].payload;
    expect(payload.customTitle).toBe('Bestehender Titel');
    expect(payload.titel).toBeUndefined();
  });

  it('empty save clears customTitle', () => {
    const dok = makeDok({
      titel: 'Sonstiges — Unbekannt',
      customTitle: 'Altes Custom',
    });
    const modal = makeModal();
    modal.editTitel = '   ';

    const dispatch = jest.fn();
    runHandleEditSpeichern({
      dok,
      dokId: dok.id,
      dispatch,
      modal,
      openConfirm: jest.fn(),
    });

    const payload = dispatch.mock.calls[0][0].payload;
    expect(payload.customTitle).toBeNull();
    expect(payload.titel).toBeUndefined();
  });
});
