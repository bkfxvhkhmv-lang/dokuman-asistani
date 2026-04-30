import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { Dokument } from '@/store';
import { useTheme } from '@/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';
import { TransitionStore } from '@/navigation/transitionStore';
import { prefetchDocumentData } from '@/hooks/queryHooks';
import Reanimated, { FadeIn, Layout } from 'react-native-reanimated';
import SwipeableDokumentKarte from '@/components/SwipeableDokumentKarte';
import StackedDokumentKarte from '@/components/StackedDokumentKarte';
import OptimisticDokumentKarte from '@/components/OptimisticDokumentKarte';
import { useStaggerFadeIn } from '@/hooks/useStaggerFadeIn';
import EmptyState, { type EmptyVariant } from '@/components/EmptyState';
import { buildDocStacks } from '@/services/CardStackService';
import {
  DOCUMENTS_SECTION_EYEBROW,
  DOCUMENTS_SECTION_SUBLINE,
  DOCUMENTS_SECTION_TITLE,
} from '@/product/strategyCopy';

// Tabs where sender-based stacking improves readability
const STACK_TABS = new Set(['Aufgaben', 'Zahlungen']);

function StaggeredRow({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useStaggerFadeIn({ index, baseDelay: 45 });
  return (
    <Reanimated.View
      style={animatedStyle}
      layout={Layout.springify().damping(18).stiffness(200)}
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
  const cardRefs = useRef<Map<string, View>>(new Map());
  const queryClient      = useQueryClient();

  // Predictive pre-fetch — after list stabilises for 800ms, warm the cache
  // for the top 3 visible docs so detail opens are instant.
  const sectionDokIds = useMemo(
    () => ((data as any).sichtbareDocs ?? []).slice(0, 3).map((d: any) => d.id).join(','),
    [(data as any).sichtbareDocs],
  );
  useEffect(() => {
    const topDocs = ((data as any).sichtbareDocs ?? []).slice(0, 3);
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
    if (data.secilenModus) data.handleSecim(dok);
    else navigateWithHero(dok.id);
  };

  const sectionMap = {
    Aufgaben: {
      title: 'Offene Aufgaben',
      eyebrow: 'FOKUS',
      docs: data.aufgaben ?? [],
    },
    Dokumente: {
      title: DOCUMENTS_SECTION_TITLE,
      eyebrow: DOCUMENTS_SECTION_EYEBROW,
      subtitle: DOCUMENTS_SECTION_SUBLINE,
      docs: data.alleDocs ?? [],
    },
    Ordner: {
      title: 'Ordner-Inhalte',
      eyebrow: 'STRUKTUR',
      docs: data.ordnerDocs?.length ? data.ordnerDocs : data.alleDocs ?? [],
    },
    Kalender: {
      title: 'Dokumente mit Frist',
      eyebrow: 'ZEITFENSTER',
      docs: data.kalDocs ?? [],
    },
    Zahlungen: {
      title: 'Weitere Zahlungsdokumente',
      eyebrow: 'ZAHLUNGEN',
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
  // Exclude optimistic docs from regular list to avoid duplicates
  const allDocs     = section.docs.filter((d: any) => !d.isOptimistic);
  const docs        = allDocs.slice(0, useStacking ? 20 : 6);

  // Build stacks only for tabs that benefit from grouping
  const stacks = useMemo(
    () => useStacking ? buildDocStacks(docs) : null,
    [docs, useStacking],
  );

  if (docs.length === 0) {
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
                label: 'Erste Datei scannen',
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
        <View>
          <Text style={[st.eyebrow, { color: data.Colors.textTertiary, fontSize: fs(10), lineHeight: fs(10) * 1.35 }]}>{section.eyebrow}</Text>
          <Text style={[st.title, { color: data.Colors.text, fontSize: fs(18) }]}>{section.title}</Text>
          {!!section.subtitle && (
            <Text
              style={{
                fontSize: fs(11),
                fontWeight: '500',
                color: data.Colors.textSecondary,
                marginTop: 3,
                lineHeight: fs(14),
                letterSpacing: 0.05,
              }}
              numberOfLines={2}
            >
              {section.subtitle}
            </Text>
          )}
        </View>
        <View style={[st.countPill, { backgroundColor: data.Colors.bgCard, borderColor: `${data.Colors.border}D9` }]}>
          <Text style={[st.countText, { color: data.Colors.textSecondary, fontSize: fs(12) }]}>{docs.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {stacks
          ? stacks.map((stack, i) => (
              <StaggeredRow key={stack.id} index={i}>
                <View ref={r => { if (r) cardRefs.current.set(stack.id, r); }}>
                  <StackedDokumentKarte
                    stack={stack}
                    onPress={(dok) => openFromList(dok)}
                    onLongPressDok={(dok) => data.handleLongPress(dok)}
                    onErledigt={data.handleSwipeErledigt}
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
                    onContextAction={(d, action) => {
                      if (action === 'bezahlt' || action === 'archivieren')
                        data.dispatch({ type: 'MARK_ERLEDIGT', id: d.id });
                      else
                        navigateWithHero(d.id);
                    }}
                  />
                </View>
              </StaggeredRow>
            ))
        }
      </ScrollView>
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
  eyebrow: {
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countPill: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countText: {
    fontWeight: '800',
  },
});
