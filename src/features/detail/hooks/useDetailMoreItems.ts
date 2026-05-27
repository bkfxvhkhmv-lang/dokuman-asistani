/**
 * „Mehr“-Menü-Reihenfolge (Produkt): 1 Zahlen/Einspruch/Kalender → 2 KI-Chat → 3 Antwort
 * → 4 Teilen/Sicher → 5 PDF — danach Original, Bearbeiten, Erledigt, Partner; Erweitert unten.
 */
import { useMemo } from 'react';
import type { Dokument } from '@/store';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types';
import type { ModalController, ModalData } from '@/features/detail/hooks/useModalController';
import type { useDocumentActions } from '@/features/detail/hooks/useDocumentActions';
import { canOfferPaymentAction } from '@/utils/documentGuards';

type OpenModalFn = (name: string, data?: ModalData) => void;

interface Params {
  dok: Dokument | null | undefined;
  actions: ReturnType<typeof useDocumentActions>;
  openModal: OpenModalFn;
  anonModus: boolean;
  setAnonModus: ModalController['setAnonModus'];
  partnerEmailEnabled: boolean;
  setMoreMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  setBudgetModalVisible: (v: boolean) => void;
}

export function useDetailMoreItems({
  dok,
  actions,
  openModal,
  anonModus,
  setAnonModus,
  partnerEmailEnabled,
  setMoreMenu,
  setBudgetModalVisible,
}: Params) {
  return useMemo<MoreMenuItem[]>(() => {
    if (!dok) return [];

    const close = () => setMoreMenu(false);

    const tap = (fn: (() => void) | undefined) =>
      (): void => {
        close();
        fn?.();
      };

    const tapAsync = (fn?: () => void | Promise<void>) =>
      (): void => {
        close();
        if (fn) void Promise.resolve(fn()).catch(() => {});
      };

    const aktiv = dok.aktionen ?? [];
    const rows: MoreMenuItem[] = [];

    if (!dok.erledigt && aktiv.includes('zahlen') && canOfferPaymentAction(dok.betrag)) {
      rows.push({
        key: 'menu_zahlen', icon: 'currency-eur', label: 'Zahlung vorbereiten', group: 'main',
        onPress: tap(actions.handleZahlen),
      });
    }

    if (!dok.erledigt && aktiv.includes('einspruch')) {
      rows.push({
        key: 'menu_einspruch', icon: 'pencil-line', label: 'Einspruch prüfen', group: 'main',
        onPress: tap(actions.handleEinspruch),
      });
    }

    if (!dok.erledigt && dok.frist) {
      rows.push({
        key: 'menu_kalender', icon: 'calendar-blank', label: 'Frist ins Kalender', group: 'main',
        onPress: tapAsync(actions.handleKalender),
      });
    }

    if (dok.rohText || dok.zusammenfassung) {
      rows.push({
        key:     'menu_chat',
        icon:    'chat-circle',
        label:   'Mit KI chatten',
        group:   'communication',
        onPress: () => { close(); openModal('chat'); },
      });
    }

    const antwortTypen: string[] = ['Behörden / Amt', 'Versicherung'];
    if (
      aktiv.includes('mail') ||
      aktiv.includes('einspruch') ||
      antwortTypen.includes(dok.typ ?? '')
    ) {
      rows.push({
        key:     'menu_vorlage',
        icon:    'envelope-simple',
        label:   'Antwort schreiben',
        group:   'communication',
        onPress: () => { close(); openModal('yanitSablon'); },
      });
    }

    if (aktiv.includes('form')) {
      rows.push({
        key:     'menu_formular',
        icon:    'clipboard-text',
        label:   'Formular ausfüllen',
        group:   'communication',
        onPress: () => { close(); openModal('formular'); },
      });
    }

    rows.push({
      key: 'menu_exportieren',
      icon: 'upload',
      label: 'Exportieren',
      group: 'secondary',
      onPress: () => { close(); openModal('exportieren'); },
    });

    rows.push({
      key: 'menu_edit', icon: 'pencil-simple', label: 'Dokument bearbeiten', group: 'secondary',
      onPress: tap(actions.handleEdit),
    });

    if (dok.erledigt) {
      rows.push({
        key: 'menu_erl',
        icon: 'arrow-counter-clockwise',
        label: 'Als offen markieren',
        group: 'secondary',
        onPress: tap(actions.handleErledigt),
      });
    }

    if (partnerEmailEnabled) {
      rows.push({
        key: 'menu_partner',
        icon: 'users',
        label: 'Partner informieren',
        group: 'secondary',
        onPress: tap(actions.handleZahlenMitPartner),
      });
    }

    rows.push({
      key:       'anon',
      icon:      anonModus ? 'eye-slash' : 'eye',
      label:     anonModus ? 'Anonymisierung ausschalten' : 'Anonymisierung einschalten',
      group:     'advanced',
      onPress:   () => { close(); setAnonModus(v => !v); },
    });

    rows.push({
      key: 'menu_signpdf', icon: 'pen-nib', label: 'PDF mit Unterschrift', group: 'advanced',
      onPress: () => { close(); openModal('signatur'); },
    });

    if (aktiv.includes('zahlen') || dok.typ === 'Rechnungen') {
      rows.push({
        key: 'menu_budget', icon: 'chart-bar', label: 'Ausgaben-Übersicht', group: 'advanced',
        onPress: () => {
          close();
          setBudgetModalVisible(true);
        },
      });
    }

    if (dok.typ === 'Behörden / Amt') {
      rows.push({
        key: 'menu_kur', icon: 'buildings', label: 'Behörden & Institutionen', group: 'advanced',
        onPress: () => { close(); openModal('kurumlar'); },
      });
    }

    rows.push({
      key: 'menu_h', icon: 'lifebuoy', label: 'Hilfe & Beratung', group: 'advanced',
      onPress: () => { close(); openModal('hilfe'); },
    });

    rows.push({
      key:         'del',
      icon:        'trash',
      label:       'Dokument löschen',
      group:       'advanced',
      destructive: true,
      onPress:     tap(actions.handleLoeschen),
    });

    return rows;
  }, [dok, actions, openModal, anonModus, setAnonModus, partnerEmailEnabled, setMoreMenu, setBudgetModalVisible]);
}
