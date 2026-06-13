import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { Dokument } from '@/store';
import { useTheme } from '@/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';
import { TransitionStore } from '@/navigation/transitionStore';
import { prefetchDocumentData } from '@/hooks/queryHooks';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import SwipeableDokumentKarte from '@/components/SwipeableDokumentKarte';
import StackedDokumentKarte from '@/components/StackedDokumentKarte';
import OptimisticDokumentKarte from '@/components/OptimisticDokumentKarte';
import { useStaggerFadeIn } from '@/hooks/useStaggerFadeIn';
import EmptyState, { type EmptyVariant } from '@/components/EmptyState';
import { buildDocStacks } from '@/services/CardStackService';
import {
  getDocumentsSectionEyebrow,
  getDocumentsSectionSubline,
} from '@/product/strategyCopy';
import { useT } from '@/hooks/useT';
import { AppInput } from '@/design/components';
import { filterBySearch } from '@/utils/search';

// Tabs where sender-based stacking improves readability
const STACK_TABS = new Set(['Aufgaben', 'Zahlungen']);

function StaggeredRow({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useStaggerFadeIn({ index, baseDelay: 45 });
  return (
    <Reanimated.View
      style={animatedStyle}
    >
      {children}
    </Reanimated.View>
  );
}

const TAB_VARIANT: Record<string, EmptyVariant> = {
  Aufgaben:  'tasks',
  Dokumente: 'docs',
  Ordner:    'folder',
  Kalender:  'calendar',
  Zahlungen: 'payments',
};

function HomeRecentListInner({ data }: { data: any }) {
  const router = useRouter();
  const { fs } = useTheme();
  const { t: T } = useT();
  const [showAll, setShowAll] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const cardRefs = useRef<Map<string, View>>(new Map());
  const queryClient      = useQueryClient();

  // Predictive pre-fetch — after list stabilises for 800ms, warm the cache
  // for the top visible doc so detail opens are instant.
  const sectionDokIds = useMemo(
    () => ((data as any).sichtbareDocs ?? []).slice(0, 1).map((d: any) => d.id).join(','),
    [(data as any).sichtbareDocs],
  );
  useEffect(() => {
    const topDocs = ((data as any).sichtbareDocs ?? []).slice(0, 1);
    if (topDocs.length === 0) return;
    const timer = setTimeout(() => {
      topDocs.forEach((dok: any) => prefetchDocumentData(queryClient, dok));
    }, 800); // 800ms after list render — user has "seen" it
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionDokIds, queryClient]);

  const navigateWithHero = (dokId: string) => {
    router.push({ pathname: '/detail', params: { dokId } });
  };

  const openFromList = (dok: Dokument) => {
    if (data.secilenModus) {
      Haptics.selectionAsync();
      data.handleSecim(dok);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigateWithHero(dok.id);
    }
  };

  const sectionMap = {
    Aufgaben: {
      title: T('detail.section.tasks'),
      eyebrow: T('detail.status.action_needed'),
      docs: data.aufgaben ?? [],
    },
    Dokumente: {
      title: T('home.recent'),
      eyebrow: getDocumentsSectionEyebrow(),
      subtitle: getDocumentsSectionSubline(),
      docs: data.alleDocs ?? [],
    },
    Ordner: {
      title: T('empty.title'),
      eyebrow: T('field.type'),
      docs: data.ordnerDocs?.length ? data.ordnerDocs : data.alleDocs ?? [],
    },
    Kalender: {
      title: T('field.deadline'),
      eyebrow: T('doc.this_week'),
      docs: data.kalDocs ?? [],
    },
    Zahlungen: {
      title: T('field.amount'),
      eyebrow: T('dash.amount'),
      docs: (data.zahlungsDocs ?? []).slice(2),
    },
  };

  // Optimistic (pending) docs — always shown at the top regardless of tab
  const optimisticDocs = useMemo(
    () => data.sichtbareDocs?.filter((d: any) => d.isOptimistic) ?? [],
    [data.sichtbareDocs],
  );

  const section     = (sectionMap as any)[data.aktiv] || sectionMap.Dokumente;
  const useStacking = STACK_TABS.has(data.aktiv);
  // Exclude optimistic and flagged duplicates; deduplicate by typ+betrag+absender fingerprint
  const allDocs = section.docs.filter((d: any) => !d.isOptimistic && !d._duplikat);
  const deduped = allDocs.filter((d: any, i: number) => {
    const fp = `${d.typ}|${d.betrag}|${d.absender}`;
    return allDocs.findIndex((x: any) => `${x.typ}|${x.betrag}|${x.absender}` === fp) === i;
  });
  const INITIAL_LIMIT = useStacking ? 20 : 6;
  const normalizedQuery = listQuery.trim();
  const listBase = showAll ? allDocs : deduped;
  const searched = normalizedQuery.length >= 2
    ? filterBySearch(listBase, { query: normalizedQuery })
    : listBase;
  const effectiveShowAll = showAll || normalizedQuery.length >= 2;
  const docs = searched.slice(0, effectiveShowAll ? searched.length : INITIAL_LIMIT);

  const hiddenByDedupe = !showAll && allDocs.length > deduped.length;
  const hiddenByLimit = !effectiveShowAll && searched.length > INITIAL_LIMIT;
  const showExpandAffordance =
    !data.secilenModus && normalizedQuery.length < 2 && (hiddenByDedupe || hiddenByLimit);

  // Build stacks only for tabs that benefit from grouping
  const stacks = useMemo(
    () => useStacking ? buildDocStacks(docs) : null,
    [docs, useStacking],
  );

  if (docs.length === 0) {
    if (normalizedQuery.length >= 2) {
      return <EmptyState variant="search" compact={false} />;
    }
    // S2.3: Bos durum CTA — varsayilan sekme "Dokumente" oldugu icin
    // ilk acilis bos kalirsa kullaniciyi dogrudan tarama akisina yonlendir.
    const variant = TAB_VARIANT[data.aktiv] ?? 'generic';
    const showScanCta = variant === 'docs' || variant === 'folder';
    return (
      <EmptyState
        variant={variant}
        compact={false}
        action={
          showScanCta
            ? {
                label: T('home.triage.scan_new'),
                onPress: () => router.push('/(tabs)/Kamera'),
              }
            : undefined
        }
      />
    );
  }

  return (
    <View style={st.wrap}>
      <View style={st.header}>
        <Text style={[st.title, { color: data.Colors.text, fontSize: fs(17) }]}>{section.title}</Text>
        {docs.length > 0 && (
          <TouchableOpacity
            onPress={data.secilenModus ? data.secimiIptal : data.secimiBaslat}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={data.secilenModus ? T('search.cancel') : T('search.select')}
            accessibilityState={{ selected: data.secilenModus }}
          >
            {data.secilenModus ? (
              <View style={{
                backgroundColor: data.Colors.primary,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                  {T('search.cancel')}
                </Text>
              </View>
            ) : (
              <Text style={{ color: data.Colors.primary, fontSize: 14, fontWeight: '600' }}>
                {T('search.select')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {!data.secilenModus && (
        <AppInput
          variant="search"
          placeholder={T('home.list_search.placeholder')}
          value={listQuery}
          onChangeText={setListQuery}
          onClear={() => setListQuery('')}
          style={{ marginHorizontal: 16, marginBottom: 8 }}
        />
      )}

      {!data.secilenModus && hiddenByDedupe ? (
        <Text style={[st.dedupeHint, { color: data.Colors.textTertiary, fontSize: fs(12) }]}>
          {docs.length} von {allDocs.length} angezeigt · Ähnliche Belege zusammengefasst
        </Text>
      ) : null}

      <View>
        {stacks
          ? stacks.map((stack, i) => (
              <StaggeredRow key={stack.id} index={i}>
                <View ref={r => { if (r) cardRefs.current.set(stack.id, r); }}>
                  <StackedDokumentKarte
                    stack={stack}
                    onPress={(dok) => openFromList(dok)}
                    onLongPressDok={(dok) => data.handleLongPress(dok)}
                    onErledigt={data.handleSwipeErledigt}
                    secilen={!!data.secilenIds?.has?.(stack.lead.id)}
                    isSelectionMode={!!data.secilenModus}
                  />
                </View>
              </StaggeredRow>
            ))
          : docs.map((dok: any, i: number) => (
              <StaggeredRow key={dok.id} index={i}>
                {/* ref wrapper — measured for hero expand transition */}
                <View ref={r => { if (r) cardRefs.current.set(dok.id, r); }}>
                  <SwipeableDokumentKarte
                    dok={dok}
                    secilen={!!data.secilenIds?.has?.(dok.id)}
                    onPress={() => openFromList(dok)}
                    onLongPress={() => data.handleLongPress(dok)}
                    onErledigt={data.handleSwipeErledigt}
                    onContextAction={(d) => navigateWithHero(d.id)}
                  />
                </View>
              </StaggeredRow>
            ))
        }
      </View>

      {showExpandAffordance ? (
        <TouchableOpacity
          onPress={() => setShowAll(true)}
          style={st.allLink}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <Text style={[st.allLinkLabel, { color: data.Colors.primary }]}>
            {T('home.show_all_documents', { n: allDocs.length })}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const HomeRecentList = React.memo(HomeRecentListInner);
export default HomeRecentList;

const st = StyleSheet.create({
  wrap: {
    paddingBottom: 24,
  },
  header: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  allLink: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  dedupeHint: {
    marginHorizontal: 16,
    marginBottom: 8,
    lineHeight: 17,
  },
  allLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
