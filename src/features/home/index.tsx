import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { FlatList, ScrollView, View, RefreshControl, Text, Animated, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { styles } from '@/features/home/styles';
import HomeHeader from '@/features/home/components/HomeHeader';
import HomeUrgencyBanner from '@/features/home/components/HomeUrgencyBanner';
import useHomeData from '@/features/home/hooks/useHomeData';
import { setTabBarCollapsed } from '@/navigation/tabBarVisibility';
import { HomeSkeletonLoader } from '@/components/SkeletonLoader';
import { buildBudgetSnapshot } from '@/services/BudgetEngine';
import { buildHotDocs } from '@/services/PriorityService';
import { generateDigest } from '@/services/DigestAIService';
import type { DigestResult } from '@/services/DigestAIService';
import { analyzeAllTargets } from '@/services/TargetService';
import DashboardSummary from '@/design/components/DashboardSummary';
import AppBottomSheet from '@/components/AppBottomSheet';
import PdfMergeDragModal from '@/components/PdfMergeDragModal';
import HomeSelectionBar from '@/features/home/components/HomeSelectionBar';
import { useHomeSuggestions } from '@/hooks/useSmartSuggestions';
import SmartTimelinePanel from '@/components/SmartTimelinePanel';
import { useTimelineView } from '@/hooks/useSmartTimeline';
import { useTheme } from '@/ThemeContext';
import { setTabBarHidden } from '@/navigation/tabBarVisibility';
import { useHomeRecentListState } from '@/features/home/hooks/useHomeRecentListState';
import { HomeFeedRow, useHomeFeedRowHandlers } from '@/features/home/components/HomeFeedRow';
import { HomeRecentListChrome, useHomeFeedPrefetch } from '@/features/home/components/HomeRecentListChrome';
import { getHomeFeedFlatListProps } from '@/features/home/feed/homeFeedFlatListConfig';
import type { HomeFeedItem } from '@/features/home/feed/homeFeedTypes';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<HomeFeedItem>);

const ENABLE_HOT = false;
const ENABLE_CONTEXT_STRIP = false;
const ENABLE_RELEASE_STATS_ROW = false;
const ENABLE_RELEASE_SUGGESTIONS_STRIP = false;
const ENABLE_RELEASE_PULL_DIGEST = false;
const ENABLE_RELEASE_SKIA_REFRESH_INDICATOR = false;

const shouldComputeHotDocs = ENABLE_HOT || ENABLE_RELEASE_PULL_DIGEST;
const shouldComputeTargets = ENABLE_RELEASE_STATS_ROW || ENABLE_RELEASE_PULL_DIGEST;
const shouldComputeSuggestions = ENABLE_RELEASE_SUGGESTIONS_STRIP;
const shouldComputeDigest = ENABLE_RELEASE_PULL_DIGEST;
const shouldComputeTimeline = false;

export default function Home() {
  const data = useHomeData();
  const router = useRouter();
  const lastOffsetRef = useRef(0);
  const collapsedRef  = useRef(false);

  const { Colors: C } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const budget  = useMemo(() => buildBudgetSnapshot(data.sichtbareDocs), [data.sichtbareDocs]);
  const hotDocs = useMemo(
    () => (shouldComputeHotDocs ? buildHotDocs(data.sichtbareDocs) : []),
    [shouldComputeHotDocs, data.sichtbareDocs],
  );
  useHomeSuggestions(shouldComputeSuggestions ? (data.alleDocs ?? []) : []);
  const { view: timelineView, wochenZusammenfassung } =
    useTimelineView(shouldComputeTimeline ? (data.alleDocs ?? []) : []);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const openTimeline  = useCallback(() => setTimelineVisible(true),  []);
  const closeTimeline = useCallback(() => setTimelineVisible(false), []);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing]           = useState(false);
  const [digestVisible, setDigestVisible]     = useState(false);
  const [digest, setDigest]                   = useState<DigestResult | null>(null);

  const targets = useMemo(
    () =>
      shouldComputeTargets
        ? analyzeAllTargets(data.state.einstellungen.budgetTargets ?? [], data.sichtbareDocs)
        : [],
    [shouldComputeTargets, data.state.einstellungen.budgetTargets, data.sichtbareDocs],
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (shouldComputeDigest) {
      setDigest(null);
      setDigestVisible(true);
    }
    await data.runSync();
    setRefreshing(false);
    if (!shouldComputeDigest) return;
    generateDigest(data.sichtbareDocs, hotDocs, budget, targets)
      .then(result => setDigest(result))
      .catch(() => setDigest({ text: 'Analyse erfolgreich abgeschlossen.', source: 'local', severity: 'ok', icon: '✅' }));
  }, [data, hotDocs, budget, targets, shouldComputeDigest]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportierenRoute = useCallback(() => {
    const ids = JSON.stringify([...data.secilenIds]);
    data.secimiIptal();
    router.push({ pathname: '/(tabs)/Export', params: { selectedIds: ids } });
  }, [data.secilenIds, data.secimiIptal, router]);


  useEffect(() => {
    setTabBarCollapsed(false);
    setTabBarHidden(false);
    collapsedRef.current = false;

    return () => {
      setTabBarCollapsed(false);
      setTabBarHidden(false);
    };
  }, []);

  useEffect(() => {
    setTabBarHidden(data.secilenModus);

    if (data.secilenModus) {
      setTabBarCollapsed(false);
      collapsedRef.current = false;
    }

    return () => {
      setTabBarHidden(false);
    };
  }, [data.secilenModus]);

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

  const listState = useHomeRecentListState(data);
  const { feed, listQuery, setListQuery, setShowAll } = listState;
  const { openFromList, navigateWithHero } = useHomeFeedRowHandlers(data);
  useHomeFeedPrefetch(feed.prefetchDocIds, data.sichtbareDocs);

  const showSkeleton = data.initialLaden && (data.alleDocs?.length ?? 0) === 0;
  const feedItems = feed.emptyReason || showSkeleton ? [] : feed.items;

  const listHeader = useMemo(
    () => (
      <View style={[styles.content, { marginTop: -topInset }]}>
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
        <HomeUrgencyBanner
          colors={data.Colors}
          riskColors={data.RiskColors}
          document={data.naechste?.id === hotDocs[0]?.dok.id ? null : data.naechste}
          daysLeft={data.naechsteTage}
          extraCount={Math.max((data.kalDocs?.length ?? 0) - 1, 0)}
          onPress={() => data.naechste?.id && router.push({ pathname: '/detail', params: { dokId: data.naechste!.id } })}
        />
        {showSkeleton ? (
          <HomeSkeletonLoader />
        ) : (
          <HomeRecentListChrome
            data={data}
            feed={feed}
            listQuery={listQuery}
            onListQueryChange={setListQuery}
            onShowAll={() => setShowAll(true)}
            headerOnly
          />
        )}
      </View>
    ),
    [
      data,
      scrollY,
      openTimeline,
      router,
      hotDocs,
      feed,
      listQuery,
      setListQuery,
      setShowAll,
      showSkeleton,
      topInset,
    ],
  );

  const listFooter = useMemo(
    () => (
      <View style={{ paddingBottom: data.secilenModus ? bottomInset + 140 : tabBarHeight + bottomInset + 24 }}>
        {!showSkeleton && (
          <HomeRecentListChrome
            data={data}
            feed={feed}
            listQuery={listQuery}
            onListQueryChange={setListQuery}
            onShowAll={() => setShowAll(true)}
            expandFooterOnly
          />
        )}
      </View>
    ),
    [data, feed, listQuery, setListQuery, setShowAll, showSkeleton, bottomInset, tabBarHeight],
  );

  const listEmpty = useMemo(() => {
    if (showSkeleton) return null;
    if (!feed.emptyReason) return null;
    return (
      <HomeRecentListChrome
        data={data}
        feed={feed}
        listQuery={listQuery}
        onListQueryChange={setListQuery}
        onShowAll={() => setShowAll(true)}
      />
    );
  }, [showSkeleton, feed, data, listQuery, setListQuery, setShowAll]);

  const renderFeedItem = useCallback(
    ({ item }: { item: HomeFeedItem }) => (
      <HomeFeedRow item={item} data={data} onOpen={openFromList} onNavigate={navigateWithHero} />
    ),
    [data, openFromList, navigateWithHero],
  );

  const keyExtractor = useCallback((item: HomeFeedItem) => item.key, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: data.Colors.bg }]} edges={['top', 'left', 'right']}>
    <AnimatedFlatList
      style={{ flex: 1 }}
      data={feedItems}
      renderItem={renderFeedItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      ListEmptyComponent={listEmpty}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false, listener: handleScroll },
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
      {...getHomeFeedFlatListProps(feed.useStacking)}
    />

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

    </SafeAreaView>
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
