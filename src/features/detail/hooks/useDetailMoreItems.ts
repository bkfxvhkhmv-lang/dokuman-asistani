/**
 * Inline tool order (Erledigen tab):
 * Exportieren → Angaben bearbeiten → Ausgaben →
 * Antwort → Erledigt → Löschen
 */
import { useMemo } from 'react';
import type { Dokument } from '@/store';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types';
import type { ModalData } from '@/features/detail/hooks/useModalController';
import type { useDocumentActions } from '@/features/detail/hooks/useDocumentActions';
import { canOfferPaymentAction, hasCompletePaymentTarget } from '@/utils/documentGuards';
import { analyzeFinanzamt } from '@/features/detail/services/finanzamtAnalysis';

type OpenModalFn = (name: string, data?: ModalData) => void;

interface Params {
  dok: Dokument | null | undefined;
  actions: ReturnType<typeof useDocumentActions>;
  openModal: OpenModalFn;
  partnerEmailEnabled: boolean;
  setBudgetModalVisible: (v: boolean) => void;
  onRevertSignature?: () => void;
}

export function useDetailMoreItems({
  dok,
  actions,
  openModal,
  partnerEmailEnabled,
  setBudgetModalVisible,
  onRevertSignature,
}: Params) {
  return useMemo<MoreMenuItem[]>(() => {
    if (!dok) return [];

    const tap = (fn: (() => void) | undefined) =>
      (): void => { fn?.(); };

    const tapAsync = (fn?: () => void | Promise<void>) =>
      (): void => { if (fn) void Promise.resolve(fn()).catch(() => {}); };

    const aktiv = dok.aktionen ?? [];
    const rows: MoreMenuItem[] = [];
    const isFinanzamtReply = analyzeFinanzamt(dok).isFinanzamt;

    // ── 1. Exportieren ────────────────────────────────────────────────────────
    rows.push({
      key: 'menu_exportieren', icon: 'upload', label: 'Exportieren', group: 'secondary',
      onPress: () => openModal('exportieren'),
    });

    // ── 2. Angaben bearbeiten ─────────────────────────────────────────────────
    rows.push({
      key: 'menu_edit',
      icon: 'pencil-simple',
      label: 'Angaben bearbeiten',
      subtitle: 'Typ, Betrag, Datum oder Absender anpassen',
      group: 'secondary',
      onPress: tap(actions.handleEdit),
    });

    // ── 3. Ausgaben-Übersicht (conditional) ──────────────────────────────────
    if (aktiv.includes('zahlen') || dok.typ === 'Rechnungen') {
      rows.push({
        key: 'menu_budget', icon: 'chart-bar', label: 'Ausgaben-Übersicht', group: 'advanced',
        onPress: () => setBudgetModalVisible(true),
      });
    }

    // ── 4. Antwort schreiben (conditional) ───────────────────────────────────
    if (isFinanzamtReply) {
      rows.push({
        key: 'menu_vorlage', icon: 'envelope-simple', label: 'Antwort schreiben', group: 'communication',
        onPress: () => openModal('yanitSablon'),
      });
    }

    // ── 5. Unterschrift entfernen (only after a signed PDF exists) ───────────
    if (dok.unsignedUri && onRevertSignature) {
      rows.push({
        key: 'menu_revert_sig', icon: 'arrow-counter-clockwise',
        label: 'Unterschrift entfernen', group: 'advanced',
        onPress: onRevertSignature,
      });
    }

    // ── 6. Partner informieren (conditional) ─────────────────────────────────
    if (partnerEmailEnabled) {
      rows.push({
        key: 'menu_partner', icon: 'users', label: 'Partner informieren', group: 'secondary',
        onPress: tap(actions.handleZahlenMitPartner),
      });
    }

    // ── 7. Als erledigt / Als offen ──────────────────────────────────────────
    rows.push(
      dok.erledigt
        ? { key: 'menu_erl', icon: 'arrow-counter-clockwise', label: 'Als offen markieren',    group: 'secondary', onPress: tap(actions.handleErledigt) }
        : { key: 'menu_erl', icon: 'check-circle',             label: 'Als erledigt markieren', group: 'secondary', onPress: tap(actions.handleErledigt) },
    );

    // ── 8. Dokument löschen (destructive) ────────────────────────────────────
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
  }, [dok, actions, openModal, partnerEmailEnabled, setBudgetModalVisible, onRevertSignature]);
}
