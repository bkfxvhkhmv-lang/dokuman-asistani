/**
 * „Mehr“-Menü-Reihenfolge (Produkt): 1 Zahlen/Einspruch/Kalender → 2 KI-Chat → 3 Antwort
 * → 4 Teilen/Sicher → 5 PDF — danach Original, Bearbeiten, Erledigt, Partner; Erweitert unten.
 */
import { useMemo } from 'react';
import type { Dokument } from '@/store';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types';
import type { ModalController, ModalData } from '@/features/detail/hooks/useModalController';
import type { useDocumentActions } from '@/features/detail/hooks/useDocumentActions';

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

    if (!dok.erledigt && aktiv.includes('zahlen')) {
      rows.push({
        key: 'menu_zahlen', icon: '💶', label: 'Zahlung vorbereiten', group: 'main',
        onPress: tap(actions.handleZahlen),
      });
    }

    if (!dok.erledigt && aktiv.includes('einspruch')) {
      rows.push({
        key: 'menu_einspruch', icon: '✍️', label: 'Einspruch prüfen', group: 'main',
        onPress: tap(actions.handleEinspruch),
      });
    }

    if (!dok.erledigt && dok.frist) {
      rows.push({
        key: 'menu_kalender', icon: '📅', label: 'Frist ins Kalender', group: 'main',
        onPress: tapAsync(actions.handleKalender),
      });
    }

    rows.push({
      key:       'menu_chat',
      icon:      '💬',
      label:     'Mit KI chatten',
      group:     'communication',
      onPress:   () => { close(); openModal('chat'); },
    });

    rows.push({
      key:       'menu_vorlage',
      icon:      '✉️',
      label:     'Antwort schreiben',
      group:     'communication',
      onPress:   () => { close(); openModal('yanitSablon'); },
    });

    rows.push({
      key:       'menu_formular',
      icon:      '📋',
      label:     'Formular ausfüllen',
      group:     'communication',
      onPress:   () => { close(); openModal('formular'); },
    });

    rows.push({
      key: 'menu_teilen',
      icon: '📤',
      label: 'Teilen',
      group: 'secondary',
      onPress: () => { close(); actions.handleTeilen(anonModus); },
    });

    rows.push({
      key: 'menu_sicher', icon: '🔗', label: 'Sicher teilen', group: 'secondary',
      onPress: tap(actions.handleGuvenliPaylasim),
    });

    rows.push({
      key: 'menu_pdf', icon: '📄', label: 'PDF exportieren', group: 'secondary',
      onPress: tapAsync(actions.handlePDF),
    });

    rows.push({
      key: 'menu_orig', icon: '📎', label: 'Original teilen', group: 'secondary',
      onPress: tapAsync(actions.handleOriginalTeilen),
    });

    rows.push({
      key: 'menu_edit', icon: '📝', label: 'Dokument bearbeiten', group: 'secondary',
      onPress: tap(actions.handleEdit),
    });

    if (dok.erledigt) {
      rows.push({
        key: 'menu_erl',
        icon: '↩️',
        label: 'Als offen markieren',
        group: 'secondary',
        onPress: tap(actions.handleErledigt),
      });
    }

    if (partnerEmailEnabled) {
      rows.push({
        key: 'menu_partner',
        icon: '🤝',
        label: 'Partner informieren',
        group: 'secondary',
        onPress: tap(actions.handleZahlenMitPartner),
      });
    }

    rows.push({
      key:       'anon',
      icon:      anonModus ? '🙈' : '🕵️',
      label:     anonModus ? 'Anonymisierung ausschalten' : 'Anonymisierung einschalten',
      group:     'advanced',
      onPress:   () => { close(); setAnonModus(v => !v); },
    });

    rows.push({
      key: 'menu_signpdf', icon: '✒️', label: 'PDF mit Unterschrift', group: 'advanced',
      onPress: () => { close(); openModal('signatur'); },
    });

    rows.push({
      key: 'menu_budget', icon: '📊', label: 'Ausgaben-Übersicht', group: 'advanced',
      onPress: () => {
        close();
        setBudgetModalVisible(true);
      },
    });

    rows.push({
      key: 'menu_kur', icon: '🏛️', label: 'Behörden & Institutionen', group: 'advanced',
      onPress: () => { close(); openModal('kurumlar'); },
    });

    rows.push({
      key: 'menu_h', icon: '🆘', label: 'Hilfe & Beratung', group: 'advanced',
      onPress: () => { close(); openModal('hilfe'); },
    });

    rows.push({
      key:         'del',
      icon:        '🗑️',
      label:       'Dokument löschen',
      group:       'advanced',
      destructive: true,
      onPress:     tap(actions.handleLoeschen),
    });

    return rows;
  }, [dok, actions, openModal, anonModus, setAnonModus, partnerEmailEnabled, setMoreMenu, setBudgetModalVisible]);
}
