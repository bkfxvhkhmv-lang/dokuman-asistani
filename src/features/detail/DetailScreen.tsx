import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Animated, PanResponder } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from '../../components/Icon';

import { useTheme } from '../../ThemeContext';
import DetailModalsContainer, { type MoreMenuItem } from './DetailModalsContainer';

import DetailHeader from './components/DetailHeader';
import DetailProcessTracker from './components/DetailProcessTracker';
import OzetTab from './components/OzetTab';
import DigitalTwinPanel from './components/DigitalTwinPanel';
import AIBox from './components/AIBox';
import RiskPanel from './components/RiskPanel';
import TasksPanel from './components/TasksPanel';
import ActionsPanel, { getDetailActionPlan } from './components/ActionsPanel';
import DetailsPanel from './components/DetailsPanel';
import { getInstitutionSendProfile } from './services/documentActionFlows';

import { useDocumentDetail } from './hooks/useDocumentDetail';
import { useDetailScreenAnimations } from './hooks/useDetailScreenAnimations';
import { useActionSessionManager } from './hooks/useActionSessionManager';
import { useModalController } from './hooks/useModalController';
import { useDocumentActions } from './hooks/useDocumentActions';

// V12 Smart hooks
import { useSmartActions } from '../../hooks/useSmartActions';
import { useSmartLinking } from '../../hooks/useSmartLinking';
import { useSmartReminders } from '../../hooks/useSmartReminders';
import { useSmartSummary } from '../../hooks/useSmartSummary';
import { useDocumentRisk } from '../../hooks/useSmartRiskEngine';

// V12 Smart panels
import SmartActionsPanel from '../../components/SmartActionsPanel';
import SmartLinksPanel from '../../components/SmartLinksPanel';
import SmartRemindersPanel from '../../components/SmartRemindersPanel';
import SmartSummaryCard from '../../components/SmartSummaryCard';
import SmartRiskPanel from '../../components/SmartRiskPanel';

import ChatEntryBar from './components/ChatEntryBar';
import FloatingActionPulse, { type PulseUrgency } from '../../components/FloatingActionPulse';
import BudgetGrafikModal from '../../components/BudgetGrafikModal';

export default function Detailbildschirm() {
  const router = useRouter();
  const { dokId: dokIdParam } = useLocalSearchParams();
  const dokId = Array.isArray(dokIdParam) ? dokIdParam[0] : (dokIdParam ?? '');
  const { Colors: C } = useTheme();

  const modal = useModalController();
  const [moreMenu, setMoreMenu] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);

  const {
    scrollY, headerShadowOpacity, headerBorderOpacity, heroParallaxY, headerProgress,
    onTabScroll, onScrollContentSize, onScrollLayout,
    mountOpacity, mountScale, handleBack: animatedBack,
    tabOpacity, tabScale, aktifTab, handleTabPress,
    swipeX, panResponder,
  } = useDetailScreenAnimations();

  const handleBack = () => animatedBack(() => router.back());

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

  // V12 Smart features
  const smartActions = useSmartActions(detail.dok ?? null);
  const smartLinks = useSmartLinking(detail.dok ?? null, detail.state.dokumente);
  const smartReminders = useSmartReminders(detail.dok ?? null);
  const smartSummary = useSmartSummary(detail.dok ?? null);
  const smartRisk = useDocumentRisk(detail.dok ?? null, detail.state.dokumente);

  const allDoksMap = useMemo(() => {
    const m = new Map<string, { titel: string; typ: string; absender: string }>();
    detail.state.dokumente.forEach(d => m.set(d.id, { titel: d.titel, typ: d.typ, absender: d.absender }));
    return m;
  }, [detail.state.dokumente]);

  const handleSmartAction = useMemo(() => (key: string) => {
    switch (key) {
      case 'zahlen':            actions.handleZahlen(); break;
      case 'einspruch':         actions.handleEinspruch(); break;
      case 'kalender':          actions.handleKalender(); break;
      case 'erledigt':          actions.handleErledigt(); break;
      case 'teilen':            actions.handleTeilen(modal.anonModus); break;
      case 'teilen_anonym':     actions.handleGuvenliPaylasim(); break;
      case 'pdf_export':        actions.handlePDF(); break;
      case 'ai_erklären':       modal.open('aciklama'); break;
      case 'ai_chat':           modal.open('chat'); break;
      case 'bearbeiten':        actions.handleEdit(); break;
      case 'aufgabe_hinzufügen':modal.open('aufgaben'); break;
      default: break;
    }
  }, [actions, modal]);

  if (!detail.dok) {
    return (
      <SafeAreaView style={[st.fill, { backgroundColor: C.bg }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
          {/* Illustration */}
          <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: `${C.primary}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 36 }}>📭</Text>
            </View>
          </View>

          <Text style={{ fontSize: 19, fontWeight: '700', color: C.text, textAlign: 'center', letterSpacing: -0.4, marginBottom: 8 }}>
            Dokument nicht gefunden
          </Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 }}>
            Dieses Dokument wurde möglicherweise gelöscht oder verschoben.
          </Text>

          {/* Assistant hint */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.primaryLight, borderRadius: 14, borderWidth: 1, borderColor: `${C.primary}28`, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 28, alignSelf: 'stretch' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 5, flexShrink: 0 }} />
            <Text style={{ flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18, fontStyle: 'italic' }}>
              Deine anderen Dokumente sind sicher. Du kannst jederzeit neue hinzufügen.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: C.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999 }}
            accessibilityRole="button"
            accessibilityLabel="Zurück zur Übersicht"
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: -0.1 }}>Zur Übersicht</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const actionHandlers = useMemo(() => ({
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
  }), [actions, modal, modal.anonModus]);

  const actionPlan = useMemo(
    () => getDetailActionPlan(detail.dok, detail.digitalTwin, actionHandlers, detail.state),
    [detail.dok, detail.digitalTwin, actionHandlers, detail.state]
  );
  const institutionSendProfile = useMemo(
    () => detail.dok ? getInstitutionSendProfile(detail.dok) : null,
    [detail.dok]
  );

  const pulseUrgency: PulseUrgency =
    detail.dok.risiko === 'hoch'   ? 'high'   :
    detail.dok.risiko === 'mittel' ? 'medium' : 'low';

  const moreItems = useMemo<MoreMenuItem[]>(() => {
    const base = (actionPlan?.hidden || []) as MoreMenuItem[];
    return [
      ...base,
      {
        key: 'anon',
        label: modal.anonModus ? 'Anonymisierung ausschalten' : 'Anonymisierung einschalten',
        icon: modal.anonModus ? '🙈' : '🕵️',
        onPress: () => { setMoreMenu(false); modal.setAnonModus(v => !v); },
      },
      {
        key: 'original',
        label: 'Original teilen',
        icon: '📎',
        onPress: () => { setMoreMenu(false); actions.handleOriginalTeilen(); },
      },
      {
        key: 'budget',
        label: 'Ausgaben-Übersicht',
        icon: '📊',
        onPress: () => { setMoreMenu(false); setBudgetModalVisible(true); },
      },
      {
        key: 'delete',
        label: 'Dokument löschen',
        icon: '🗑️',
        destructive: true,
        onPress: () => { setMoreMenu(false); actions.handleLoeschen(); },
      },
    ];
  }, [actionPlan, actions, modal, modal.anonModus]);

  const handleOzetAktion = handleSmartAction;

  const handlePrimaryAction = () => {
    actionPlan?.primary?.onPress?.();
  };

  return (
    <SafeAreaView style={[st.fill, { backgroundColor: C.bg }]}>
      <Animated.View
        style={[st.fill, { opacity: mountOpacity, transform: [{ scale: mountScale }, { translateX: swipeX }] }]}
        {...panResponder.panHandlers}
      >
      {/* Scroll-linked header (Airbnb / Ek 7) */}
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
        />
      </Animated.View>

      {/* #45 Sticky tab bar — elevated shadow appears on scroll */}
      <Animated.View style={{
        flexDirection: 'row',
        backgroundColor: C.bgCard,
        borderBottomWidth: 0.5,
        borderBottomColor: C.border,
        shadowColor: C.text,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        shadowOpacity: (headerShadowOpacity as Animated.AnimatedInterpolation<number>),
        elevation: 4,
        zIndex: 10,
      }}>
        {[
          { id: 'ozet', label: 'Übersicht', icon: 'document-text-outline' },
          { id: 'analiz', label: 'Analyse', icon: 'analytics-outline' },
          { id: 'detay', label: 'Details', icon: 'list-outline' },
          { id: 'eylem', label: 'Aktionen', icon: 'flash-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => handleTabPress(tab.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: aktifTab === tab.id ? C.primary : 'transparent',
            }}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={aktifTab === tab.id ? C.primary : C.textTertiary}
            />
            <Text
              style={{
                fontSize: 10,
                marginTop: 2,
                fontWeight: aktifTab === tab.id ? '700' : '400',
                color: aktifTab === tab.id ? C.primary : C.textTertiary,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Scroll-linked progress bar */}
      <View style={{ height: 2, backgroundColor: C.borderLight, overflow: 'hidden' }}>
        <Animated.View
          style={{
            height: 2,
            backgroundColor: C.primary,
            width: (headerProgress as Animated.Value).interpolate({
              inputRange: [0, 1], outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>

      <DetailProcessTracker digitalTwin={detail.digitalTwin} />

      <Animated.View style={{ flex: 1, opacity: tabOpacity, transform: [{ scale: tabScale }] }}>
        {aktifTab === 'ozet' && (
          <OzetTab
            dok={detail.dok}
            info={detail.info}
            score={detail.score}
            scoreColor={detail.scoreColor}
            docIntent={detail.docIntent}
            outcomePrediction={detail.outcomePrediction}
            kontaktName={modal.kontaktName || detail.dok?.kontaktName || null}
            onKontaktVerknuepfen={() => actions.handleKontaktVerknuepfen(modal.setKontaktName)}
            onSimulator={() => modal.open('simulator')}
            anonModus={modal.anonModus}
            ozetKartlari={detail.ozetKartlari}
            onOzetAktion={handleOzetAktion}
            onMailTaslak={actions.handleMailTaslak}
            ozetQuellenSichtbar={modal.ozetQuellenSichtbar}
            setOzetQuellenSichtbar={modal.setOzetQuellenSichtbar}
            institutionSendProfile={institutionSendProfile}
            documentChain={detail.documentChain}
          />
        )}

        {aktifTab === 'analiz' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 132 }}
            scrollEventThrottle={16}
            onScroll={onTabScroll}
            onContentSizeChange={onScrollContentSize}
            onLayout={onScrollLayout}
          >
            <SmartSummaryCard
              result={smartSummary.result}
              loading={smartSummary.loading}
              currentMode={smartSummary.mode}
              onModeChange={smartSummary.setMode}
              onLoadDetailed={smartSummary.loadDetailed}
            />

            <DigitalTwinPanel
              digitalTwin={detail.digitalTwin}
              institutionDesc={detail.institutionDesc?.description ?? detail.institutionDesc?.name ?? null}
              isLoading={!detail.digitalTwin && !!detail.dok}
            />

            <AIBox
              dok={detail.dok}
              onMailTaslak={actions.handleMailTaslak}
              ozetQuellenSichtbar={modal.ozetQuellenSichtbar}
              setOzetQuellenSichtbar={modal.setOzetQuellenSichtbar}
              ozetQuellen={detail.ozetQuellen || []}
            />

            {smartRisk && (
              <SmartRiskPanel result={smartRisk} onAktion={handleSmartAction} />
            )}

            <RiskPanel
              ocrRisiken={detail.ocrRisiken}
              hukukiRisiken={detail.hukukiRisiken}
              hukukiSkor={detail.hukukiSkor}
              hukukiSkorColor={detail.hukukiSkorColor}
              darkPatterns={detail.darkPatterns}
              vertragRisiken={detail.vertragRisiken}
              dokTyp={detail.dok?.typ}
              rohText={detail.dok?.rohText}
            />

            <TasksPanel
              aufgaben={detail.aufgaben}
              offeneAufgaben={detail.offeneAufgaben}
              vorschlaege={detail.aufgabenVorschlaege}
              onOpenAddModal={() => modal.open('aufgaben')}
              onToggle={(a: { id: string; erledigt: boolean }) =>
                detail.dispatch({
                  type: 'UPDATE_AUFGABE',
                  dokId,
                  payload: { id: a.id, erledigt: !a.erledigt },
                })
              }
              onAdd={(v) =>
                detail.dispatch({
                  type: 'ADD_AUFGABE',
                  dokId,
                  payload: {
                    id: v.id || Date.now().toString(36),
                    titel: v.titel,
                    faellig: v.frist || null,
                    erledigt: false,
                  },
                })
              }
            />

            <ChatEntryBar dok={detail.dok} onOpen={() => modal.open('chat')} />
          </ScrollView>
        )}

        {aktifTab === 'detay' && (
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 132 }}
            scrollEventThrottle={16}
            onScroll={onTabScroll}
            onContentSizeChange={onScrollContentSize}
            onLayout={onScrollLayout}>
            {smartLinks && (
              <SmartLinksPanel result={smartLinks} allDoksMap={allDoksMap} />
            )}
            <DetailsPanel
              dok={detail.dok}
              mevcutEtiketten={detail.mevcutEtiketten}
              extrahierteFelder={detail.extrahierteFelder}
              aehnlicheDoks={detail.aehnlicheDoks}
              ocrRisiken={detail.ocrRisiken}
              graph={detail.graph}
            />
          </ScrollView>
        )}

        {aktifTab === 'eylem' && (
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 132 }}
            scrollEventThrottle={16}
            onScroll={onTabScroll}
            onContentSizeChange={onScrollContentSize}
            onLayout={onScrollLayout}>
            {smartActions && (
              <SmartActionsPanel result={smartActions} onAction={handleSmartAction} />
            )}
            <SmartRemindersPanel
              suggestions={smartReminders.suggestions}
              scheduled={smartReminders.scheduled}
              isScheduling={smartReminders.isScheduling}
              onSchedule={smartReminders.schedule}
              onCancel={smartReminders.cancel}
              isAlreadyScheduled={smartReminders.isAlreadyScheduled}
            />
            <ActionsPanel
              dok={detail.dok}
              digitalTwin={detail.digitalTwin}
              actionPlan={actionPlan}
              onOpenMore={() => setMoreMenu(prev => !prev)}
              onBack={() => handleTabPress('ozet')}
              institutionSendProfile={institutionSendProfile}
            />
          </ScrollView>
        )}
      </Animated.View>

      <FloatingActionPulse
        visible={!!actionPlan?.primary}
        label={actionPlan?.primary?.label ?? ''}
        sublabel={detail.dok.absender || detail.dok.typ || undefined}
        urgency={pulseUrgency}
        onPress={handlePrimaryAction}
      />

      <DetailModalsContainer
        modal={modal}
        dok={detail.dok!}
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

      </Animated.View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  fill:       { flex: 1 },
  headerWrap: { zIndex: 10 },
});
