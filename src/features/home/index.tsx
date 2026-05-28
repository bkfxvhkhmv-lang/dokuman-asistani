import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { ScrollView, View, RefreshControl, Text, Animated, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { styles } from '@/features/home/styles';
import HomeHeader from '@/features/home/components/HomeHeader';
import HomeRecentList from '@/features/home/components/HomeRecentList';
import HomeUrgencyBanner from '@/features/home/components/HomeUrgencyBanner';
import useHomeData from '@/features/home/hooks/useHomeData';
import { setTabBarCollapsed } from '@/navigation/tabBarVisibility';
import { HomeSkeletonLoader } from '@/components/SkeletonLoader';
import { buildBudgetSnapshot } from '@/services/BudgetEngine';
import HotCardSection from '@/features/home/components/HotCardSection';
import HomePullDigest from '@/features/home/components/HomePullDigest';
import { buildHotDocs } from '@/services/PriorityService';
import type { HotDoc } from '@/services/PriorityService';
import ContextualActionStrip from '@/features/home/components/ContextualActionStrip';
import SkiaRefreshIndicator from '@/components/SkiaRefreshIndicator';
import { generateDigest } from '@/services/DigestAIService';
import type { DigestResult } from '@/services/DigestAIService';
import { analyzeAllTargets } from '@/services/TargetService';
import DashboardSummary from '@/design/components/DashboardSummary';
import AppBottomSheet from '@/components/AppBottomSheet';
import PdfMergeDragModal from '@/components/PdfMergeDragModal';
import HomeSelectionBar from '@/features/home/components/HomeSelectionBar';
import HomeStatsRow from '@/features/home/components/HomeStatsRow';
import HomeSuggestionsStrip from '@/features/home/components/HomeSuggestionsStrip';
import { useHomeSuggestions } from '@/hooks/useSmartSuggestions';
import SmartTimelinePanel from '@/components/SmartTimelinePanel';
import { useTimelineView } from '@/hooks/useSmartTimeline';
import { useTheme } from '@/ThemeContext';
import HomeTriage from '@/features/home/components/HomeTriage';

const ENABLE_HOT = false;
const ENABLE_CONTEXT_STRIP = false;
const ENABLE_RELEASE_STATS_ROW = false;
const ENABLE_RELEASE_SUGGESTIONS_STRIP = false;
const ENABLE_RELEASE_PULL_DIGEST = false;
const ENABLE_RELEASE_SKIA_REFRESH_INDICATOR = false;


export default function Home() {
  const data = useHomeData();
  const router = useRouter();
  const activeTab = data.aktiv;
  const lastOffsetRef = useRef(0);
  const collapsedRef  = useRef(false);

  const { Colors: C } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const budget  = useMemo(() => buildBudgetSnapshot(data.sichtbareDocs), [data.sichtbareDocs]);
  const hotDocs = useMemo(() => buildHotDocs(data.sichtbareDocs),        [data.sichtbareDocs]);
  const { suggestions: homeSuggestions, handleHomeSuggestion } = useHomeSuggestions(data.alleDocs ?? []);
  const { view: timelineView, wochenZusammenfassung } = useTimelineView(data.alleDocs ?? []);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const openTimeline  = useCallback(() => setTimelineVisible(true),  []);
  const closeTimeline = useCallback(() => setTimelineVisible(false), []);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing]           = useState(false);
  const [digestVisible, setDigestVisible]     = useState(false);
  const [digest, setDigest]                   = useState<DigestResult | null>(null);
  const [dismissedHotIds, setDismissedHotIds] = useState<Set<string>>(new Set());
  const activeStrip = useMemo(
    () => hotDocs.slice(1).find(h => !dismissedHotIds.has(h.dok.id)) ?? null,
    [hotDocs, dismissedHotIds],
  );

  const targets = useMemo(
    () => analyzeAllTargets(data.state.einstellungen.budgetTargets ?? [], data.sichtbareDocs),
    [data.state.einstellungen.budgetTargets, data.sichtbareDocs],
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setDigest(null);          // show shimmer immediately
    setDigestVisible(true);
    await data.runSync();
    setRefreshing(false);
    // Generate digest in background — updates banner when ready
    generateDigest(data.sichtbareDocs, hotDocs, budget, targets)
      .then(result => setDigest(result))
      .catch(() => setDigest({ text: 'Analyse abgeschlossen.', source: 'local', severity: 'ok', icon: '✅' }));
  }, [data, hotDocs, budget, targets]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportierenRoute = useCallback(() => {
    const ids = JSON.stringify([...data.secilenIds]);
    data.secimiIptal();
    router.push({ pathname: '/(tabs)/Export', params: { selectedIds: ids } });
  }, [data.secilenIds, data.secimiIptal, router]);

  useEffect(() => {
    setTabBarCollapsed(false);
    collapsedRef.current = false;

    return () => {
      setTabBarCollapsed(false);
    };
  }, []);

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const delta = offsetY - lastOffsetRef.current;

    if (offsetY <= 16) {
      if (collapsedRef.current) {
        setTabBarCollapsed(false);
        collapsedRef.current = false;
      }
      lastOffsetRef.current = offsetY;
      return;
    }

    if (delta > 12 && !collapsedRef.current) {
      setTabBarCollapsed(true);
      collapsedRef.current = true;
    } else if (delta < -12 && collapsedRef.current) {
      setTabBarCollapsed(false);
      collapsedRef.current = false;
    }

    lastOffsetRef.current = offsetY;
  };

  return (
    <View style={[styles.container, { backgroundColor: data.Colors.bg }]}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + bottomInset + 24 }]}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false, listener: handleScroll }
      )}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="transparent"
          colors={['transparent']}
        />
      }
    >
      <HomeHeader data={data} scrollY={scrollY} />

      <DashboardSummary
        urgent={data.dringend.length}
        openTasks={data.aufgaben.length}
        amountOpen={data.zahlungsSumme}
        nextDeadlineDays={data.naechsteTage ?? undefined}
        nextDeadlineTitle={data.naechste?.titel ?? data.naechste?.absender ?? undefined}
        onPruefe={() => data.handleTabPress('Dokumente')}
        onFrist={openTimeline}
      />

      {ENABLE_RELEASE_STATS_ROW && (
        <HomeStatsRow
          colors={data.Colors}
          shadow={data.Shadow}
          stats={data.dashStats}
          spacing={data.S}
        />
      )}

      {ENABLE_RELEASE_SUGGESTIONS_STRIP && homeSuggestions.length > 0 && (
        <HomeSuggestionsStrip
          suggestions={homeSuggestions}
          onPress={handleHomeSuggestion}
        />
      )}

      {ENABLE_RELEASE_PULL_DIGEST && (
        <HomePullDigest
          digest={digest}
          visible={digestVisible}
          onDismiss={() => { setDigestVisible(false); setDigest(null); }}
        />
      )}

      {ENABLE_HOT && (
        <HotCardSection
          hotDocs={hotDocs.slice(0, 1)}
          onPress={(h: HotDoc) => router.push({ pathname: '/detail', params: { dokId: h.dok.id } })}
        />
      )}


      <HomeTriage
        docs={data.sichtbareDocs}
        onPress={() => data.handleTabPress('Dokumente')}
        onScanPress={() => router.push('/(tabs)/Kamera')}
      />

      {/* UrgencyBanner only when naechste is NOT already shown in HotCardSection */}
      <HomeUrgencyBanner
        colors={data.Colors}
        riskColors={data.RiskColors}
        document={data.naechste?.id === hotDocs[0]?.dok.id ? null : data.naechste}
        daysLeft={data.naechsteTage}
        extraCount={Math.max((data.kalDocs?.length ?? 0) - 1, 0)}
        onPress={() => data.naechste?.id && router.push({ pathname: '/detail', params: { dokId: data.naechste!.id } })}
      />

      {data.initialLaden && (data.alleDocs?.length ?? 0) === 0
        ? <HomeSkeletonLoader />
        : <HomeRecentList data={data} />
      }
    </ScrollView>

      {ENABLE_CONTEXT_STRIP && activeStrip && (
        <View style={{ position: 'absolute', bottom: 108, left: 16, right: 16 }}>
          <ContextualActionStrip
            key={activeStrip.dok.id}
            hotDoc={activeStrip}
            onAction={(h) => {
              setDismissedHotIds(prev => new Set(prev).add(h.dok.id));
              router.push({ pathname: '/detail', params: { dokId: h.dok.id } });
            }}
            onDismiss={() =>
              setDismissedHotIds(prev => new Set(prev).add(activeStrip.dok.id))
            }
          />
        </View>
      )}
      {/* #41 Skia pull-to-refresh aura */}
      {ENABLE_RELEASE_SKIA_REFRESH_INDICATOR && (
        <SkiaRefreshIndicator refreshing={refreshing} topOffset={60} />
      )}

      <AppBottomSheet
        visible={!!data.sheetConfig}
        onClose={data.hideSheet}
        title={data.sheetConfig?.title ?? ''}
        message={data.sheetConfig?.message}
        icon={data.sheetConfig?.icon ?? 'information-circle'}
        tone={data.sheetConfig?.tone ?? 'default'}
        actions={data.sheetConfig?.actions ?? [{ label: 'OK', variant: 'primary', onPress: data.hideSheet }]}
      />

      <PdfMergeDragModal
        visible={data.pdfMergeModal}
        items={data.mergeReihenfolge}
        onClose={() => data.setPdfMergeModal(false)}
        onDone={() => { data.secimiIptal(); }}
      />

      {data.secilenModus ? (
        <HomeSelectionBar
          count={data.secilenIds.size}
          onAbbrechen={data.secimiIptal}
          onExport={handleExportierenRoute}
          onSteuerpaket={data.handleSteuerpaketAuswahl}
          onLoeschen={data.handleBatchLoeschen}
          C={data.Colors}
          dangerColor={data.RiskColors.hoch.color}
        />
      ) : null}

      <Modal
        visible={timelineVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeTimeline}
      >
        <SafeAreaView style={[tlSt.sheet, { backgroundColor: C.bg }]}>
          <View style={[tlSt.handle, { backgroundColor: C.border }]} />
          <View style={[tlSt.header, { borderBottomColor: C.borderLight }]}>
            <Text style={[tlSt.title, { color: C.text }]}>Fristen & Termine</Text>
            <TouchableOpacity onPress={closeTimeline} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[tlSt.close, { color: C.primary }]}>Fertig</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={tlSt.scroll} showsVerticalScrollIndicator={false}>
            <SmartTimelinePanel
              view={timelineView}
              wochenZusammenfassung={wochenZusammenfassung}
              showWochenCard
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </View>
  );
}

const tlSt = StyleSheet.create({
  sheet:  { flex: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title:  { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  close:  { fontSize: 16, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
});
