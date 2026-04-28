import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { ScrollView, View, RefreshControl, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AuroraBackground from '../../design/components/AuroraBackground';
import { styles } from './styles';
import HomeHeader from './components/HomeHeader';
import HomeRecentList from './components/HomeRecentList';
import HomeUrgencyBanner from './components/HomeUrgencyBanner';
import HomeFilterModal from './components/HomeFilterModal';
import useHomeData from './hooks/useHomeData';
import { setTabBarCollapsed } from '../../navigation/tabBarVisibility';
import { HomeSkeletonLoader } from '../../components/SkeletonLoader';
import { buildBudgetSnapshot } from '../../services/BudgetEngine';
import HotCardSection from './components/HotCardSection';
import HomePullDigest from './components/HomePullDigest';
import { buildHotDocs } from '../../services/PriorityService';
import type { HotDoc } from '../../services/PriorityService';
import ContextualActionStrip from './components/ContextualActionStrip';
import SkiaRefreshIndicator from '../../components/SkiaRefreshIndicator';
import { generateDigest } from '../../services/DigestAIService';
import type { DigestResult } from '../../services/DigestAIService';
import { analyzeAllTargets } from '../../services/TargetService';


export default function Home() {
  const data = useHomeData();
  const router = useRouter();
  const activeTab = data.aktiv;
  const lastOffsetRef = useRef(0);
  const collapsedRef  = useRef(false);

  const budget  = useMemo(() => buildBudgetSnapshot(data.sichtbareDocs), [data.sichtbareDocs]);
  const hotDocs = useMemo(() => buildHotDocs(data.sichtbareDocs),        [data.sichtbareDocs]);
  const [refreshing, setRefreshing]           = useState(false);
  const [digestVisible, setDigestVisible]     = useState(false);
  const [digest, setDigest]                   = useState<DigestResult | null>(null);
  const [dismissedHotIds, setDismissedHotIds] = useState<Set<string>>(new Set());
  // HotCardSection already shows hotDocs[0] — strip starts from index 1 to avoid duplicate CTA
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
      <AuroraBackground primary={data.Colors.primary} success={data.Colors.success} />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
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
      <HomeHeader data={data} />
      <HomeFilterModal
        visible={data.filterOffen}
        onClose={() => data.setFilterOffen(false)}
        colors={data.Colors}
        shadow={data.Shadow}
        spacing={data.S}
        radius={data.R}
        activeTab={activeTab}
        filter={data.filter}
        setFilter={data.setFilter}
      />

      <HomePullDigest
        digest={digest}
        visible={digestVisible}
        onDismiss={() => { setDigestVisible(false); setDigest(null); }}
      />

      {/* Asistan seçimi — en kritik 1 belge */}
      <HotCardSection
        hotDocs={hotDocs.slice(0, 1)}
        onPress={(h: HotDoc) => router.push({ pathname: '/detail', params: { dokId: h.dok.id } })}
      />

      {/* allClear — no urgent docs, system has data */}
      {hotDocs.length === 0 && (data.alleDocs?.length ?? 0) > 0 && !data.initialLaden && (
        <View style={{
          marginHorizontal: 16, marginBottom: 12,
          paddingHorizontal: 16, paddingVertical: 14,
          borderRadius: 16, borderWidth: 1,
          borderColor: `${data.Colors.success}44`,
          backgroundColor: data.Colors.successLight,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Text style={{ fontSize: 22 }}>✓</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: data.Colors.successText ?? data.Colors.success }}>
              Heute alles gut.
            </Text>
            <Text style={{ fontSize: 12, color: data.Colors.successText ?? data.Colors.success, opacity: 0.75, marginTop: 2 }}>
              Kein Handlungsbedarf — alle Dokumente im grünen Bereich.
            </Text>
          </View>
        </View>
      )}

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

      {/* ── Contextual Action Strip — sits above the floating tab bar ── */}
      {activeStrip && (
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
      <SkiaRefreshIndicator refreshing={refreshing} topOffset={60} />

    </View>
  );
}
