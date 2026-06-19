import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { safeBack } from '@/navigation/safeBack';
import { useActionSessionManager } from '@/features/detail/hooks/useActionSessionManager';
import { useDocumentDetail } from '@/features/detail/hooks/useDocumentDetail';
import { useDetailScreenAnimations } from '@/features/detail/hooks/useDetailScreenAnimations';
import { useModalController } from '@/features/detail/hooks/useModalController';
import { useDocumentActions } from '@/features/detail/hooks/useDocumentActions';
import { useSmartLinking } from '@/hooks/useSmartLinking';
import { useSmartReminders } from '@/hooks/useSmartReminders';
import { useSmartSummary } from '@/hooks/useSmartSummary';
import { useDocumentRisk } from '@/hooks/useSmartRiskEngine';
import { getDetailActionPlan } from '@/features/detail/components/ActionsPanel';
import { runDetailSmartAction } from '@/features/detail/services/detailSmartRouting';
import { useAnalyzeSavedDocument } from '@/features/detail/hooks/useAnalyzeSavedDocument';
import { isUnanalysedQuickSaved as checkUnanalysedQuickSaved } from '@/features/detail/utils/isUnanalysedQuickSaved';
import type { PulseUrgency } from '@/components/FloatingActionPulse';

export function useDetailBildschirmLogic() {
  const router = useRouter();
  const { dokId: dokIdParam, tab: tabParam } = useLocalSearchParams<{ dokId?: string | string[]; tab?: string }>();
  const dokId =
    typeof dokIdParam === 'string'
      ? dokIdParam.trim()
      : Array.isArray(dokIdParam)
        ? (dokIdParam[0] ?? '').trim()
        : '';

  const modal = useModalController();
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [pagesViewer, setPagesViewer] = useState<{ visible: boolean; index: number }>({
    visible: false,
    index: 0,
  });
  const openPagesViewer = (index: number = 0) => setPagesViewer({ visible: true, index });
  const closePagesViewer = () => setPagesViewer(prev => ({ ...prev, visible: false }));

  const {
    scrollY, headerShadowOpacity, headerBorderOpacity, heroParallaxY, headerProgress,
    onTabScroll, onScrollContentSize, onScrollLayout,
    mountOpacity, mountScale, handleBack: animatedBack,
    tabOpacity, tabScale, aktifTab, handleTabPress,
    swipeX, panResponder,
  } = useDetailScreenAnimations(tabParam ?? 'analiz');

  const handleBack = () => animatedBack(() => safeBack(router));

  const { beginActionSession } = useActionSessionManager(
    (data) => modal.open('confirm', data)
  );

  const detail = useDocumentDetail(dokId, modal.ozetQuellenSichtbar);

  const actions = useDocumentActions({
    dok: detail.dok,
    dokId,
    dispatch: detail.dispatch,
    modal,
    state: detail.state,
    router,
    onActionSessionStart: beginActionSession,
  });

  const smartLinks = useSmartLinking(detail.dok ?? null, detail.state.dokumente);
  const smartReminders = useSmartReminders(detail.dok ?? null);
  const smartSummary = useSmartSummary(detail.dok ?? null);
  const smartRisk = useDocumentRisk(detail.dok ?? null, detail.state.dokumente);

  const allDoksMap = useMemo(() => {
    const m = new Map<string, { titel: string; typ: string; absender: string }>();
    detail.state.dokumente.forEach(d => m.set(d.id, { titel: d.titel, typ: d.typ, absender: d.absender }));
    return m;
  }, [detail.state.dokumente]);

  const handleSmartAction = useMemo(
    () => (key: string) => runDetailSmartAction(key, { actions, modal }),
    [actions, modal],
  );

  const actionHandlers = useMemo((): Record<string, () => void> => {
    if (!detail.dok) return {};
    return {
      onZahlen: actions.handleZahlen,
      onZahlenMitPartner: actions.handleZahlenMitPartner,
      onEinspruch: actions.handleEinspruch,
      onTeilen: () => actions.handleTeilen(modal.anonModus),
      onPDF: actions.handlePDF,
      onFormular: () => modal.open('formular'),
      onKalender: actions.handleKalender,
      onSicherTeilen: actions.handleGuvenliPaylasim,
      onMailTaslak: actions.handleMailTaslak,
      onErledigt: actions.handleErledigt,
      onAciklama: () => modal.open('aciklama'),
      onChat: () => modal.open('chat'),
      onYanitSablon: () => modal.open('yanitSablon'),
      onKurumlar: () => modal.open('kurumlar'),
      onHilfe: () => modal.open('hilfe'),
      onEdit: actions.handleEdit,
    };
  }, [actions, modal, detail.dok]);

  const rawActionPlan = useMemo(
    () =>
      detail.dok
        ? getDetailActionPlan(detail.dok, detail.digitalTwin, actionHandlers, detail.state)
        : null,
    [detail.dok, detail.digitalTwin, actionHandlers, detail.einstellungen?.partnerEmail]
  );

  const pulseUrgency: PulseUrgency = !detail.dok
    ? 'low'
    : detail.dok.risiko === 'hoch'
      ? 'high'
      : detail.dok.risiko === 'mittel'
        ? 'medium'
        : 'low';

  const {
    status: analyzeStatus,
    error: analyzeError,
    isEligible: analyzeEligible,
    startAnalyze: onAnalyzeSavedDocument,
  } = useAnalyzeSavedDocument(detail.dok, detail.dispatch);

  const isAnalyzing = analyzeStatus === 'uploading' || analyzeStatus === 'processing';
  const isUnanalysedQuickSaved = checkUnanalysedQuickSaved(detail.dok, analyzeStatus);

  const actionPlan = isUnanalysedQuickSaved ? null : rawActionPlan;

  const switchedToOverviewAfterAnalyzeRef = useRef(false);
  useEffect(() => {
    if (analyzeStatus === 'uploading' || analyzeStatus === 'processing') {
      switchedToOverviewAfterAnalyzeRef.current = false;
      return;
    }

    const hasAnalysisContent =
      Boolean(detail.dok?.rohText?.trim()) ||
      Boolean(detail.dok?.zusammenfassung?.trim());

    const OVERVIEW_TAB_ID = 'analiz';

    if (
      analyzeStatus === 'done' &&
      aktifTab !== OVERVIEW_TAB_ID &&
      !switchedToOverviewAfterAnalyzeRef.current &&
      hasAnalysisContent
    ) {
      switchedToOverviewAfterAnalyzeRef.current = true;
      handleTabPress(OVERVIEW_TAB_ID);
    }
  }, [analyzeStatus, aktifTab, detail.dok?.rohText, detail.dok?.zusammenfassung, handleTabPress]);

  const handleOzetAktion = handleSmartAction;

  const handlePrimaryAction = () => {
    actionPlan?.primary?.onPress?.();
  };

  return {
    router,
    dokId,
    detail,
    modal,
    actions,
    smartLinks,
    smartReminders,
    smartSummary,
    smartRisk,
    allDoksMap,
    handleSmartAction,
    handleBack,
    budgetModalVisible,
    setBudgetModalVisible,
    pagesViewer,
    openPagesViewer,
    closePagesViewer,
    scrollY,
    headerShadowOpacity,
    headerBorderOpacity,
    heroParallaxY,
    headerProgress,
    onTabScroll,
    onScrollContentSize,
    onScrollLayout,
    mountOpacity,
    mountScale,
    tabOpacity,
    tabScale,
    aktifTab,
    handleTabPress,
    swipeX,
    panResponder,
    actionPlan,
    pulseUrgency,
    handleOzetAktion,
    handlePrimaryAction,
    beginActionSession,
    analyzeStatus,
    analyzeError,
    analyzeEligible,
    isAnalyzing,
    isUnanalysedQuickSaved,
    onAnalyzeSavedDocument,
  };
}
