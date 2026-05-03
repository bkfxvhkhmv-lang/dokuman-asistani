import React, { useCallback, useMemo, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';

import { useTheme } from '@/ThemeContext';
import DetailModalsContainer from '@/features/detail/DetailModalsContainer';

import DetailHeader from '@/features/detail/components/DetailHeader';
import DetailProcessTracker from '@/features/detail/components/DetailProcessTracker';
import OzetTab from '@/features/detail/components/OzetTab';
import DetailAnalysisTab from '@/features/detail/components/tabs/DetailAnalysisTab';
import DetailActionsTab from '@/features/detail/components/tabs/DetailActionsTab';
import DetailDetailsTab from '@/features/detail/components/tabs/DetailDetailsTab';

import FloatingActionPulse from '@/components/FloatingActionPulse';
import BudgetGrafikModal from '@/components/BudgetGrafikModal';
import DocumentPagesViewer from '@/features/detail/components/DocumentPagesViewer';
import DetailDeadlineBanner, { shouldShowDetailDeadlineBanner } from '@/features/detail/components/DetailDeadlineBanner';
import { pagesForViewer } from '@/features/detail/utils/pagesForViewer';

import { useDetailBildschirmLogic } from '@/features/detail/detail-screen/useDetailBildschirmLogic';
import { DocumentNotFoundView } from '@/features/detail/detail-screen/DocumentNotFoundView';
import { DetailStickyTabBar } from '@/features/detail/detail-screen/DetailStickyTabBar';
import { DetailScrollProgressBar } from '@/features/detail/detail-screen/DetailScrollProgressBar';
import { DETAIL_SCREEN_TABS, DETAIL_SIMPLE_SCREEN_TABS } from '@/features/detail/detail-screen/detailTabConfig';
import { detailScreenStyles as st } from '@/features/detail/detail-screen/detailScreen.styles';
import { deriveNaechsterSchrittZeile } from '@/utils/detailNextStep';
import { safeBack } from '@/navigation/safeBack';
import { useStore } from '@/store';
import { enqueueV4Upload } from '@/services/v4EnqueueUpload';
import { getDocumentPipelineInfo } from '@/utils/documentPipelineStatus';

const ENABLE_RELEASE_FLOATING_ACTION_PULSE = false;
const ENABLE_RELEASE_PROCESS_TRACKER = false;
const ENABLE_RELEASE_DEADLINE_BANNER = false;

export default function Detailbildschirm() {
  const { Colors: C, isSimpleMode } = useTheme();
  const { dispatch } = useStore();
  const L = useDetailBildschirmLogic();

  useFocusEffect(
    useCallback(() => {
      return () => {
        void Speech.stop();
      };
    }, []),
  );

  const {
    router,
    dokId,
    detail,
    modal,
    actions,
    smartActions,
    smartReminders,
    smartSummary,
    smartRisk,
    handleSmartAction,
    handleBack,
    moreMenu,
    setMoreMenu,
    budgetModalVisible,
    setBudgetModalVisible,
    pagesViewer,
    openPagesViewer,
    closePagesViewer,
    headerShadowOpacity,
    headerBorderOpacity,
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
    moreItems,
    moreMenuCount,
    handleOzetAktion,
    handlePrimaryAction,
    beginActionSession,
    smartLinks,
    allDoksMap,
  } = L;

  useEffect(() => {
    if (isSimpleMode && aktifTab !== 'ozet') {
      handleTabPress('ozet');
    }
    // Nur bei Theme-Flip — Tab-Liste schrumpft auf eine Ansicht.
  }, [isSimpleMode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dokId) {
    return (
      <SafeAreaView style={[st.fill, { backgroundColor: C.bg }]}>
        <DocumentNotFoundView
          onBackToOverview={() => safeBack(router)}
        />
      </SafeAreaView>
    );
  }

  if (!detail.dok) {
    return (
      <DocumentNotFoundView
        onBackToOverview={() => safeBack(router)}
      />
    );
  }

  const dok = detail.dok;

  const onRetryPipelineAnalysis = useCallback(() => {
    const uri = dok.pages?.[0]?.uri;
    if (!uri) return;
    enqueueV4Upload(dispatch, dok.id, uri, `${dok.id}.jpg`);
  }, [dispatch, dok.id, dok.pages]);

  const naechsterSchrittZeile = useMemo(
    () => deriveNaechsterSchrittZeile(dok, actionPlan),
    [dok, actionPlan],
  );

  const viewerPages = useMemo(() => pagesForViewer(dok), [dok]);
  const detailTabs = isSimpleMode ? DETAIL_SIMPLE_SCREEN_TABS : DETAIL_SCREEN_TABS;
  const pipelineCompleted = useMemo(() => getDocumentPipelineInfo(dok).phase === 'completed', [dok]);
  const showDeadlineStrip = useMemo(() => shouldShowDetailDeadlineBanner(dok), [dok]);
  /** Keinen zweiten Kalender-CTA, wenn bereits der untere Hinweis „Frist ins Kalender“ gilt. Auf Aktionen-Tab übernimmt die große Karte den Hauptschritt — kein FAB. */
  const showPrimaryFab = useMemo(() => {
    if (isSimpleMode) return false;
    if (aktifTab === 'eylem') return false;
    if (!pipelineCompleted) return false;
    if (!actionPlan?.primary?.onPress) return false;
    if (showDeadlineStrip && actionPlan.primary.key === 'kalender') return false;
    return true;
  }, [isSimpleMode, aktifTab, actionPlan, showDeadlineStrip, pipelineCompleted]);

  /** Grünes Özet-Banner wiederholt FAB-Label bzw. streicht mit Kalender-Leiste zusammen → ausblenden. */
  const suppressOzetNextStepBanner = useMemo(() => {
    if (isSimpleMode) return false;
    if (!actionPlan?.primary?.onPress) return false;
    if (showDeadlineStrip && actionPlan.primary.key === 'kalender') return true;
    return showPrimaryFab;
  }, [isSimpleMode, actionPlan, showDeadlineStrip, showPrimaryFab]);

  /** Kurzübersicht-Karten: kein zweiter Button für dieselbe Primäraktion (FAB / Frist-Streifen). */
  const suppressOzetKartePrimaryAktion = useMemo((): string | null => {
    const k = actionPlan?.primary?.key;
    if (!k || !actionPlan?.primary?.onPress) return null;
    if (k === 'kalender') return showDeadlineStrip || showPrimaryFab ? k : null;
    return showPrimaryFab ? k : null;
  }, [actionPlan, showDeadlineStrip, showPrimaryFab]);

  const releaseShowPrimaryFab = ENABLE_RELEASE_FLOATING_ACTION_PULSE && showPrimaryFab;
  const releaseShowDeadlineBanner = ENABLE_RELEASE_DEADLINE_BANNER && showDeadlineStrip;

  const footerPad =
    132 +
    (releaseShowPrimaryFab ? 112 : 0) +
    (releaseShowDeadlineBanner ? 84 : 0);

  return (
    <SafeAreaView style={[st.fill, { backgroundColor: C.bg }]}>
      <Animated.View
        style={[st.fill, { opacity: mountOpacity, transform: [{ scale: mountScale }, { translateX: swipeX }] }]}
        {...panResponder.panHandlers}
      >
      <Animated.View style={[
        st.headerWrap,
        {
          borderBottomColor: C.border,
          borderBottomWidth: 0.5,
          backgroundColor: C.bg,
        },
        {
          shadowColor: C.text,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 12,
          shadowOpacity: headerShadowOpacity as Animated.AnimatedInterpolation<number>,
          elevation: 0,
        },
      ]}>
        <DetailHeader
          onBack={handleBack}
          anonModus={modal.anonModus}
          moreMenuOpen={moreMenu}
          onOpenMore={() => setMoreMenu(prev => !prev)}
          erinnerungAktiv={smartReminders.scheduled.length > 0}
        />
      </Animated.View>

      <DetailStickyTabBar
        tabs={detailTabs}
        aktifTab={aktifTab}
        onTabPress={handleTabPress}
        bgCard={C.bgCard}
        border={C.border}
        textShadow={C.text}
        textTertiary={C.textTertiary}
        primary={C.primary}
        headerShadowOpacity={headerShadowOpacity}
      />

      {!isSimpleMode && (
      <>
      <DetailScrollProgressBar
        headerProgress={headerProgress}
        borderLight={C.borderLight}
        primary={C.primary}
      />

      {ENABLE_RELEASE_PROCESS_TRACKER && (
        <DetailProcessTracker digitalTwin={detail.digitalTwin} />
      )}
      </>
      )}

      <Animated.View style={{ flex: 1, opacity: tabOpacity, transform: [{ scale: tabScale }] }}>
        {aktifTab === 'ozet' && isSimpleMode && (
          <OzetTab
            dok={detail.dok}
            info={detail.info}
            score={detail.score}
            scoreColor={detail.scoreColor}
            docIntent={detail.docIntent}
            outcomePrediction={detail.outcomePrediction}
            kontaktName={modal.kontaktName || dok.kontaktName || null}
            onKontaktVerknuepfen={() => actions.handleKontaktVerknuepfen(modal.setKontaktName)}
            onSimulator={() => modal.open('simulator')}
            anonModus={modal.anonModus}
            ozetKartlari={detail.ozetKartlari}
            onOzetAktion={handleOzetAktion}
            onMailTaslak={actions.handleMailTaslak}
            ozetQuellenSichtbar={modal.ozetQuellenSichtbar}
            setOzetQuellenSichtbar={modal.setOzetQuellenSichtbar}
            documentChain={detail.documentChain}
            onOpenPages={openPagesViewer}
            scrollBottomPadding={footerPad}
            simpleLayout
            actionPlan={actionPlan}
            naechsterSchrittZeile={naechsterSchrittZeile}
            suppressNextStepBanner={suppressOzetNextStepBanner}
            suppressOzetKartePrimaryAktion={suppressOzetKartePrimaryAktion}
            onSimpleZahlen={() => actions.handleZahlen()}
            onSimpleKalender={() => actions.handleKalender()}
            onSimpleHilfe={() => modal.open('hilfe')}
            onRetryPipelineAnalysis={onRetryPipelineAnalysis}
            onKlassifikationBearbeiten={() => actions.handleEditKlassifikation()}
          />
        )}

        {aktifTab === 'ozet' && !isSimpleMode && (
          <DetailDetailsTab
            smartLinks={smartLinks}
            allDoksMap={allDoksMap}
            detail={detail}
            actionPlan={actionPlan}
            onTabScroll={onTabScroll}
            onScrollContentSize={onScrollContentSize}
            onScrollLayout={onScrollLayout}
            onOpenPages={openPagesViewer}
            scrollBottomPadding={footerPad}
            onEdit={actions.handleEdit}
            onExport={actions.handlePDF}
            onLoeschen={actions.handleLoeschen}
          />
        )}

        {aktifTab === 'analiz' && (
          <DetailAnalysisTab
            smartSummary={smartSummary}
            detail={detail}
            modal={modal}
            smartRisk={smartRisk}
            handleSmartAction={handleSmartAction}
            actions={actions}
            dokId={dokId}
            onTabScroll={onTabScroll}
            onScrollContentSize={onScrollContentSize}
            onScrollLayout={onScrollLayout}
            scrollBottomPadding={footerPad}
            actionPlan={actionPlan}
          />
        )}

{aktifTab === 'eylem' && (
          <DetailActionsTab
            smartActions={smartActions}
            smartReminders={smartReminders}
            handleSmartAction={handleSmartAction}
            detail={detail}
            actionPlan={actionPlan}
            moreMenuCount={moreMenuCount}
            onOpenMore={() => setMoreMenu(prev => !prev)}
            onBack={() => handleTabPress('ozet')}
            onTabScroll={onTabScroll}
            onScrollContentSize={onScrollContentSize}
            onScrollLayout={onScrollLayout}
            scrollBottomPadding={footerPad}
          />
        )}
      </Animated.View>

      {ENABLE_RELEASE_FLOATING_ACTION_PULSE && (
        <FloatingActionPulse
          visible={releaseShowPrimaryFab}
          label={actionPlan?.primary?.label ?? ''}
          sublabel={dok.absender || dok.typ || undefined}
          urgency={pulseUrgency}
          onPress={handlePrimaryAction}
          extraBottomInset={showDeadlineStrip ? 76 : 0}
        />
      )}

      {releaseShowDeadlineBanner && (
        <DetailDeadlineBanner
          dok={dok}
          onCalendarPress={() => actions.handleKalender()}
        />
      )}

      <DetailModalsContainer
        modal={modal}
        dok={dok}
        dokId={dokId}
        state={detail.state}
        dispatch={detail.dispatch}
        actions={actions}
        moreMenu={moreMenu}
        setMoreMenu={setMoreMenu}
        moreItems={moreItems}
        beginActionSession={beginActionSession}
        router={router}
      />

      <BudgetGrafikModal
        visible={budgetModalVisible}
        docs={detail.state.dokumente}
        onClose={() => setBudgetModalVisible(false)}
      />

      <DocumentPagesViewer
        visible={pagesViewer.visible}
        pages={viewerPages}
        initialIndex={pagesViewer.index}
        onClose={closePagesViewer}
      />

      </Animated.View>
    </SafeAreaView>
  );
}
