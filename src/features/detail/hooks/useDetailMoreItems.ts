/**
 * Inline tool order (Erledigen tab):
 * Exportieren → Angaben bearbeiten → Ausgaben →
 * Antwort → Erledigt → Löschen
 */
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import type { Dokument } from '@/store';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types';
import type { ModalData } from '@/features/detail/hooks/useModalController';
import type { useDocumentActions } from '@/features/detail/hooks/useDocumentActions';
import { canOfferPaymentAction, hasCompletePaymentTarget } from '@/utils/documentGuards';
import { analyzeFinanzamt } from '@/features/detail/services/finanzamtAnalysis';
import { useT } from '@/hooks/useT';

type OpenModalFn = (name: string, data?: ModalData) => void;

function isNkEligibleDocument(dok: Dokument): boolean {
  const typ = (dok.typ ?? '').toLowerCase();
  const subtyp = (dok.subtyp ?? '').toLowerCase();

  if (typ === 'rechnung' || typ === 'rechnungen' || typ === 'betriebskosten') {
    return true;
  }
  if (subtyp === 'nebenkosten') {
    return true;
  }

  const nkPattern =
    /heizung|wasser|müll|muell|grundsteuer|hausmeister|nebenkosten|betriebskosten|schornstein|schornsteinfeger|versicherung|gebäudeversicherung|gebaeudeversicherung|abfall|abfallgebühren|abfallgebuehren|strom|elektro|heizöl|heizoel|wartung|reinigung/i;

  const searchableText = [
    dok.titel,
    dok.dateiName,
    dok.customTitle,
    dok.aiDisplayTitle,
    dok.zusammenfassung,
    dok.absender,
    dok.rohText,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');

  return nkPattern.test(searchableText);
}

interface Params {
  dok: Dokument | null | undefined;
  actions: ReturnType<typeof useDocumentActions>;
  openModal: OpenModalFn;
  partnerEmailEnabled: boolean;
  setBudgetModalVisible: (v: boolean) => void;
  onRevertSignature?: () => void;
  onAnalyzeSavedDocument?: () => void | Promise<void>;
}

export function useDetailMoreItems({
  dok,
  actions,
  openModal,
  partnerEmailEnabled,
  setBudgetModalVisible,
  onRevertSignature,
  onAnalyzeSavedDocument,
}: Params) {
  const router = useRouter();
  const { t } = useT();
  return useMemo<MoreMenuItem[]>(() => {
    if (!dok) return [];

    const tap = (fn: (() => void) | undefined) =>
      (): void => { fn?.(); };

    const tapAsync = (fn?: () => void | Promise<void>) =>
      (): void => { if (fn) void Promise.resolve(fn()).catch(() => {}); };

    const aktiv = dok.aktionen ?? [];
    const rows: MoreMenuItem[] = [];
    const isFinanzamtReply = analyzeFinanzamt(dok).isFinanzamt;

    // ── 0. Mit KI analysieren (only for saved documents without OCR) ──────────
    if (!dok.rohText && dok.uri && onAnalyzeSavedDocument) {
      rows.push({
        key: 'menu_analyze_saved',
        icon: 'sparkle',
        label: 'Mit KI analysieren',
        group: 'secondary',
        subtitle: '1 Analyse wird verwendet',
        onPress: tapAsync(onAnalyzeSavedDocument),
      });
    }

    // ── 1. Exportieren ────────────────────────────────────────────────────────
    rows.push({
      key: 'menu_exportieren', icon: 'upload', label: t('export.sheet.title'), group: 'secondary',
      onPress: () => openModal('exportieren'),
    });

    // ── 2. Angaben bearbeiten ─────────────────────────────────────────────────
    rows.push({
      key: 'menu_edit',
      icon: 'pencil-simple',
      label: t('common.edit'),
      group: 'secondary',
      onPress: tap(actions.handleEdit),
    });

    // ── 3. Ausgaben-Übersicht (conditional) ──────────────────────────────────
    if (aktiv.includes('zahlen') || dok.typ === 'Rechnungen') {
      rows.push({
        key: 'menu_budget', icon: 'chart-bar', label: t('detail.more.budget'), group: 'advanced',
        onPress: () => setBudgetModalVisible(true),
      });
    }

    // ── 3b. Nebenkosten Kostenposition (conditional, navigation stub) ─────────
    if (isNkEligibleDocument(dok)) {
      rows.push({
        key: 'menu_nebenkosten_add',
        icon: 'receipt',
        label: 'Als Kostenposition übernehmen',
        group: 'secondary',
        onPress: () => {
          router.push({
            pathname: '/nebenkosten/assistant',
            params: {
              role: 'vermieter',
              sourceDokId: dok.id,
            },
          });
        },
      });
    }

    // ── 4. Antwort schreiben (conditional) ───────────────────────────────────
    if (isFinanzamtReply) {
      rows.push({
        key: 'menu_vorlage', icon: 'envelope-simple', label: t('detail.more.reply'), group: 'communication',
        onPress: () => openModal('yanitSablon'),
      });
    }

    // ── 5. PDF unterschreiben (only when not already signed) ─────────────────
    if (dok.uri && !dok.unsignedUri) {
      rows.push({
        key: 'menu_signpdf', icon: 'pen-nib',
        label: t('detail.more.sign_pdf'), group: 'secondary',
        onPress: () => openModal('signatur'),
      });
    }

    // ── 5b. Unterschrift entfernen (only after a signed PDF exists) ───────────
    if (dok.unsignedUri && onRevertSignature) {
      rows.push({
        key: 'menu_revert_sig', icon: 'arrow-counter-clockwise',
        label: t('detail.more.remove_signature'), group: 'advanced',
        onPress: onRevertSignature,
      });
    }

    // ── 6. Partner informieren (conditional) ─────────────────────────────────
    if (partnerEmailEnabled) {
      rows.push({
        key: 'menu_partner', icon: 'users', label: t('detail.more.partner'), group: 'secondary',
        onPress: tap(actions.handleZahlenMitPartner),
      });
    }

    // ── 7. Als erledigt / Als offen ──────────────────────────────────────────
    rows.push(
      dok.erledigt
        ? { key: 'menu_erl', icon: 'arrow-counter-clockwise', label: t('detail.more.mark_open'),    group: 'secondary', onPress: tap(actions.handleErledigt) }
        : { key: 'menu_erl', icon: 'check-circle',             label: t('detail.action.mark_done'), group: 'secondary', onPress: tap(actions.handleErledigt) },
    );

    // ── 8. Dokument löschen (destructive) ────────────────────────────────────
    rows.push({
      key: 'del', icon: 'trash', label: t('detail.delete_document'),
      group: 'advanced', destructive: true,
      onPress: tap(actions.handleLoeschen),
    });

    // Keep main-group items for legacy callers — not shown in inline list
    if (!dok.erledigt && aktiv.includes('zahlen') && canOfferPaymentAction(dok.betrag)) {
      rows.push({
        key: 'menu_zahlen', icon: 'currency-eur',
        label: hasCompletePaymentTarget(dok) ? t('detail.more.prepare_payment') : t('detail.action.pay'),
        group: 'main', onPress: tap(actions.handleZahlen),
      });
    }
    if (!dok.erledigt && aktiv.includes('einspruch')) {
      rows.push({ key: 'menu_einspruch', icon: 'pencil-line', label: t('detail.more.check_objection'), group: 'main', onPress: tap(actions.handleEinspruch) });
    }
    if (!dok.erledigt && dok.frist) {
      rows.push({ key: 'menu_kalender', icon: 'calendar-blank', label: t('detail.more.add_calendar'), group: 'main', onPress: tapAsync(actions.handleKalender) });
    }

    return rows;
  }, [dok, actions, openModal, partnerEmailEnabled, setBudgetModalVisible, onRevertSignature, onAnalyzeSavedDocument, router, t]);
}
