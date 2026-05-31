/**
 * Inline tool order (Erledigen tab):
 * Exportieren → PDF unterschreiben → Bearbeiten → Ausgaben →
 * Fragen → Antwort → Formular → Behörden → Hilfe →
 * Erledigt → Löschen
 */
import { useMemo } from 'react';
import type { Dokument } from '@/store';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types';
import type { ModalController, ModalData } from '@/features/detail/hooks/useModalController';
import type { useDocumentActions } from '@/features/detail/hooks/useDocumentActions';
import { canOfferPaymentAction, hasCompletePaymentTarget } from '@/utils/documentGuards';

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
  setMoreMenu: _setMoreMenu,
  setBudgetModalVisible,
}: Params) {
  return useMemo<MoreMenuItem[]>(() => {
    if (!dok) return [];

    const tap = (fn: (() => void) | undefined) =>
      (): void => { fn?.(); };

    const tapAsync = (fn?: () => void | Promise<void>) =>
      (): void => { if (fn) void Promise.resolve(fn()).catch(() => {}); };

    const aktiv = dok.aktionen ?? [];
    const rows: MoreMenuItem[] = [];

    // ── 1. Exportieren ────────────────────────────────────────────────────────
    rows.push({
      key: 'menu_exportieren', icon: 'upload', label: 'Exportieren', group: 'secondary',
      onPress: () => openModal('exportieren'),
    });

    // ── 2. PDF mit Unterschrift ───────────────────────────────────────────────
    rows.push({
      key: 'menu_signpdf', icon: 'pen-nib', label: 'PDF mit Unterschrift', group: 'advanced',
      onPress: () => openModal('signatur'),
    });

    // ── 3. Dokument bearbeiten ────────────────────────────────────────────────
    rows.push({
      key: 'menu_edit', icon: 'pencil-simple', label: 'Dokument bearbeiten', group: 'secondary',
      onPress: tap(actions.handleEdit),
    });

    // ── 4. Ausgaben-Übersicht (conditional) ──────────────────────────────────
    if (aktiv.includes('zahlen') || dok.typ === 'Rechnungen') {
      rows.push({
        key: 'menu_budget', icon: 'chart-bar', label: 'Ausgaben-Übersicht', group: 'advanced',
        onPress: () => setBudgetModalVisible(true),
      });
    }

    // ── 5. Fragen zum Dokument (conditional) ─────────────────────────────────
    if (dok.rohText || dok.zusammenfassung) {
      rows.push({
        key: 'menu_chat', icon: 'chat-circle', label: 'Fragen zum Dokument', group: 'communication',
        onPress: () => openModal('chat'),
      });
    }

    // ── 6. Antwort schreiben (conditional) ───────────────────────────────────
    const antwortTypen: string[] = ['Behörden / Amt', 'Versicherung'];
    if (aktiv.includes('mail') || aktiv.includes('einspruch') || antwortTypen.includes(dok.typ ?? '')) {
      rows.push({
        key: 'menu_vorlage', icon: 'envelope-simple', label: 'Antwort schreiben', group: 'communication',
        onPress: () => openModal('yanitSablon'),
      });
    }

    // ── 7. Formular ausfüllen (conditional) ──────────────────────────────────
    if (aktiv.includes('form')) {
      rows.push({
        key: 'menu_formular', icon: 'clipboard-text', label: 'Formular ausfüllen', group: 'communication',
        onPress: () => openModal('formular'),
      });
    }

    // ── 8. Behörden & Institutionen (conditional) ─────────────────────────────
    if (dok.typ === 'Behörden / Amt') {
      rows.push({
        key: 'menu_kur', icon: 'buildings', label: 'Behörden & Institutionen', group: 'advanced',
        onPress: () => openModal('kurumlar'),
      });
    }

    // ── 9. Hilfe & Beratung ───────────────────────────────────────────────────
    rows.push({
      key: 'menu_h', icon: 'lifebuoy', label: 'Hilfe & Beratung', group: 'advanced',
      onPress: () => openModal('hilfe'),
    });

    // ── 10. Anonymisierung ────────────────────────────────────────────────────
    rows.push({
      key:  'anon',
      icon: anonModus ? 'eye-slash' : 'eye',
      label: anonModus ? 'Anonymisierung ausschalten' : 'Anonymisierung einschalten',
      group: 'advanced',
      onPress: () => setAnonModus(v => !v),
    });

    // ── 11. Partner informieren (conditional) ─────────────────────────────────
    if (partnerEmailEnabled) {
      rows.push({
        key: 'menu_partner', icon: 'users', label: 'Partner informieren', group: 'secondary',
        onPress: tap(actions.handleZahlenMitPartner),
      });
    }

    // ── 12. Als erledigt / Als offen ──────────────────────────────────────────
    rows.push(
      dok.erledigt
        ? { key: 'menu_erl', icon: 'arrow-counter-clockwise', label: 'Als offen markieren',    group: 'secondary', onPress: tap(actions.handleErledigt) }
        : { key: 'menu_erl', icon: 'check-circle',             label: 'Als erledigt markieren', group: 'secondary', onPress: tap(actions.handleErledigt) },
    );

    // ── 13. Dokument löschen (destructive) ────────────────────────────────────
    rows.push({
      key: 'del', icon: 'trash', label: 'Dokument löschen',
      group: 'advanced', destructive: true,
      onPress: tap(actions.handleLoeschen),
    });

    // Keep main-group items for legacy callers — not shown in inline list
    if (!dok.erledigt && aktiv.includes('zahlen') && canOfferPaymentAction(dok.betrag)) {
      rows.push({
        key: 'menu_zahlen', icon: 'currency-eur',
        label: hasCompletePaymentTarget(dok) ? 'Zahlung vorbereiten' : 'Zahlungsdaten prüfen',
        group: 'main', onPress: tap(actions.handleZahlen),
      });
    }
    if (!dok.erledigt && aktiv.includes('einspruch')) {
      rows.push({ key: 'menu_einspruch', icon: 'pencil-line', label: 'Einspruch prüfen', group: 'main', onPress: tap(actions.handleEinspruch) });
    }
    if (!dok.erledigt && dok.frist) {
      rows.push({ key: 'menu_kalender', icon: 'calendar-blank', label: 'Frist ins Kalender', group: 'main', onPress: tapAsync(actions.handleKalender) });
    }

    return rows;
  }, [dok, actions, openModal, anonModus, setAnonModus, partnerEmailEnabled, setBudgetModalVisible]);
}
