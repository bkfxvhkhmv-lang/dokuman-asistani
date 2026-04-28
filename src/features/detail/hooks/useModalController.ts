import { useState, useCallback } from 'react';

export interface ModalData {
  title?: string;
  message?: string;
  actions?: Array<{ text: string; style?: string; onPress?: () => void }>;
  options?: Array<{ text: string; style?: string; onPress?: () => void }>;
  actionType?: string;
  expectedReturn?: unknown;
  onMarkPaid?: () => void;
  onConfirm?: () => void;
  partnerEmail?: string | null;
  amount?: string | number;
  recipient?: string;
  iban?: string | null;
  reference?: string;
  onOpenBanking?: () => Promise<{ opened: boolean; copied?: boolean; paymentText?: string }>;
  [key: string]: unknown;
}

interface ActiveModal {
  name: string;
  data?: ModalData;
}

export function useModalController() {
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  // Edit form state
  const [editTyp, setEditTyp]           = useState('');
  const [editRisiko, setEditRisiko]     = useState('');
  const [editTitel, setEditTitel]       = useState('');
  const [editAbsender, setEditAbsender] = useState('');
  const [editBetrag, setEditBetrag]     = useState('');
  const [editFrist, setEditFrist]       = useState('');
  const [editTab, setEditTab]           = useState('info');
  const [editProfilId, setEditProfilId] = useState<string | null>(null);

  // Aufgaben form state
  const [neueAufgabeTitel, setNeueAufgabeTitel]               = useState('');
  const [neueAufgabeFrist, setNeueAufgabeFrist]               = useState('');
  const [neueAufgabeVerantwortlich, setNeueAufgabeVerantwortlich] = useState('');

  // Privacy / sharing
  const [anonModus, setAnonModus]     = useState(false);
  const [kontaktName, setKontaktName] = useState<string | null>(null);

  // Other state
  const [einspruchText, setEinspruchText]           = useState('');
  const [fotoIndex, setFotoIndex]                   = useState(0);
  const [diffVersionIndex, setDiffVersionIndex]     = useState(0);
  const [gizliBisInput, setGizliBisInput]           = useState('');
  const [kisayolName, setKisayolName]               = useState('');
  const [kisayolAktionen, setKisayolAktionen]       = useState<string[]>([]);
  const [ozetQuellenSichtbar, setOzetQuellenSichtbar] = useState(false);

  const open = useCallback((name: string, data?: ModalData) => {
    setActiveModal({ name, data });
  }, []);

  const close = useCallback(() => {
    setActiveModal(null);
  }, []);

  const isOpen = useCallback((name: string) => {
    return activeModal?.name === name;
  }, [activeModal]);

  return {
    open, close, isOpen, activeModal,
    editTyp, setEditTyp,
    editRisiko, setEditRisiko,
    editTitel, setEditTitel,
    editAbsender, setEditAbsender,
    editBetrag, setEditBetrag,
    editFrist, setEditFrist,
    editTab, setEditTab,
    editProfilId, setEditProfilId,
    neueAufgabeTitel, setNeueAufgabeTitel,
    neueAufgabeFrist, setNeueAufgabeFrist,
    neueAufgabeVerantwortlich, setNeueAufgabeVerantwortlich,
    anonModus, setAnonModus,
    kontaktName, setKontaktName,
    einspruchText, setEinspruchText,
    fotoIndex, setFotoIndex,
    diffVersionIndex, setDiffVersionIndex,
    gizliBisInput, setGizliBisInput,
    kisayolName, setKisayolName,
    kisayolAktionen, setKisayolAktionen,
    ozetQuellenSichtbar, setOzetQuellenSichtbar,
  };
}

export type ModalController = ReturnType<typeof useModalController>;
