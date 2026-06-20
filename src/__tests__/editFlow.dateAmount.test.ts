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
    titel: 'Rechnung',
    typ: 'Rechnungen',
    absender: 'Telekom',
    risiko: 'niedrig',
    confidence: 80,
    createdAt: '2026-06-17T10:00:00.000Z',
    betrag: 99.36,
    frist: '2026-05-01T00:00:00.000Z',
    dokumentDatum: '2026-04-30T00:00:00.000Z',
    ...overrides,
  } as Dokument;
}

function makeModal(overrides: Partial<ModalController> = {}): ModalController {
  const state = {
    editTitel: '',
    editTyp: 'Rechnungen',
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

describe('editFlow — date/amount German input (#backlog §2)', () => {
  it('prefill uses German date and amount format', () => {
    const dok = makeDok();
    const modal = makeModal();
    runHandleEdit(dok, modal);

    expect(modal.setEditBetrag).toHaveBeenCalledWith('99,36');
    expect(modal.setEditFrist).toHaveBeenCalledWith('01.05.2026');
    expect(modal.setEditDokumentDatum).toHaveBeenCalledWith('30.04.2026');
  });

  it('save parses German input back to ISO dates and numeric betrag', () => {
    const dok = makeDok();
    const modal = makeModal();
    modal.editTitel = 'Rechnung';
    modal.editBetrag = '99,36';
    modal.editFrist = '01.05.2026';
    modal.editDokumentDatum = '30.04.2026';

    const dispatch = jest.fn();
    runHandleEditSpeichern({
      dok,
      dokId: dok.id,
      dispatch,
      modal,
      openConfirm: jest.fn(),
    });

    const payload = dispatch.mock.calls[0][0].payload;
    expect(payload.betrag).toBe(99.36);
    expect(payload.frist).toBe(new Date('2026-05-01').toISOString());
    expect(payload.dokumentDatum).toBe(new Date('2026-04-30').toISOString());
  });
});
