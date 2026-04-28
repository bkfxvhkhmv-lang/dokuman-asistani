import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import DocumentContextSheet from '../../../components/DocumentContextSheet';
import type { Dokument } from '../../../store';
import { useQueryClient } from '@tanstack/react-query';
import { TransitionStore } from '../../../navigation/transitionStore';
import { prefetchDocumentData } from '../../../hooks/queryHooks';
import Reanimated, { FadeIn, Layout } from 'react-native-reanimated';
import SwipeableDokumentKarte from '../../../components/SwipeableDokumentKarte';
import StackedDokumentKarte from '../../../components/StackedDokumentKarte';
import OptimisticDokumentKarte from '../../../components/OptimisticDokumentKarte';
import { useStaggerFadeIn } from '../../../hooks/useStaggerFadeIn';
import EmptyState, { type EmptyVariant } from '../../../components/EmptyState';
import { buildDocStacks } from '../../../services/CardStackService';

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
  const router           = useRouter();
  const cardRefs         = useRef<Map<string, View>>(new Map());
  const queryClient      = useQueryClient();
  const [contextDok, setContextDok] = useState<Dokument | null>(null);

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
    const ref = cardRefs.current.get(dokId);
    if (ref) {
      ref.measureInWindow((x, y, width, height) => {
        TransitionStore.trigger({
          x, y, width, height,
          accentColor: data.Colors.bgCard,
        });
      });
    }
    router.push({ pathname: '/detail', params: { dokId } });
  };

  const sectionMap = {
    Aufgaben: {
      title: 'Offene Aufgaben',
      eyebrow: 'FOKUS',
      docs: data.aufgaben ?? [],
    },
    Dokumente: {
      title: 'Letzte Dokumente',
      eyebrow: 'DOKUMENTE',
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
    return (
      <EmptyState
        variant={TAB_VARIANT[data.aktiv] ?? 'generic'}
        compact={false}
      />
    );
  }

  return (
    <View style={st.wrap}>
      <View style={st.header}>
        <View>
          <Text style={[st.eyebrow, { color: data.Colors.textTertiary }]}>{section.eyebrow}</Text>
          <Text style={[st.title, { color: data.Colors.text }]}>{section.title}</Text>
        </View>
        <View style={[st.countPill, { backgroundColor: data.Colors.bgCard, borderColor: `${data.Colors.border}D9` }]}>
          <Text style={[st.countText, { color: data.Colors.textSecondary }]}>{docs.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {stacks
          ? stacks.map((stack, i) => (
              <StaggeredRow key={stack.id} index={i}>
                <View ref={r => { if (r) cardRefs.current.set(stack.id, r); }}>
                  <StackedDokumentKarte
                    stack={stack}
                    onPress={(dok) => navigateWithHero(dok.id)}
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
                    onPress={() => navigateWithHero(dok.id)}
                    onLongPress={() => setContextDok(dok)}
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

      {/* #113 Long-press context menu */}
      <DocumentContextSheet
        dok={contextDok}
        onClose={() => setContextDok(null)}
        onNavigate={() => contextDok && navigateWithHero(contextDok.id)}
        onErledigt={() => contextDok && data.dispatch({ type: 'MARK_ERLEDIGT', id: contextDok.id })}
        onTeilen={() => contextDok && navigateWithHero(contextDok.id)}
        onPDF={() => contextDok && navigateWithHero(contextDok.id)}
        onLoeschen={() => contextDok && data.dispatch({ type: 'DELETE_DOKUMENT', id: contextDok.id })}
      />
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
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
    fontSize: 12,
    fontWeight: '800',
  },
});
