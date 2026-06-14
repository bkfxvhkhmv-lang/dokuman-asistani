import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { AppInput } from '@/design/components';
import EmptyState from '@/components/EmptyState';
import { prefetchDocumentData } from '@/hooks/queryHooks';
import type { HomeFeedModel } from '@/features/home/feed/homeFeedTypes';
import type { HomeRecentListData } from '@/features/home/hooks/useHomeRecentListState';

interface ChromeProps {
  data: HomeRecentListData;
  feed: HomeFeedModel;
  listQuery: string;
  onListQueryChange: (q: string) => void;
  onShowAll: () => void;
  /** Only title + search + dedupe (no expand, no empty). */
  headerOnly?: boolean;
  /** Only expand affordance row. */
  expandFooterOnly?: boolean;
}

export function HomeRecentListChrome({
  data,
  feed,
  listQuery,
  onListQueryChange,
  onShowAll,
  headerOnly = false,
  expandFooterOnly = false,
}: ChromeProps) {
  const { fs } = useTheme();
  const { t: T } = useT();
  const router = useRouter();

  if (expandFooterOnly) {
    if (!feed.showExpandAffordance) return null;
    return (
      <TouchableOpacity
        onPress={onShowAll}
        style={st.allLink}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
      >
        <Text style={[st.allLinkLabel, { color: data.Colors.primary }]}>
          {T('home.show_all_documents', { n: feed.allDocsCount })}
        </Text>
      </TouchableOpacity>
    );
  }

  if (!headerOnly && feed.emptyReason === 'search') {
    return <EmptyState variant="search" compact={false} />;
  }

  if (!headerOnly && feed.emptyReason === 'tab-empty') {
    const showScanCta = feed.emptyVariant === 'docs' || feed.emptyVariant === 'folder';
    return (
      <EmptyState
        variant={feed.emptyVariant}
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
        <Text style={[st.title, { color: data.Colors.text, fontSize: fs(17) }]}>
          {feed.section.title}
        </Text>
        {feed.displayedCount > 0 && (
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
          onChangeText={onListQueryChange}
          onClear={() => onListQueryChange('')}
          style={{ marginHorizontal: 16, marginBottom: 8 }}
        />
      )}

      {!data.secilenModus && feed.hiddenByDedupe ? (
        <Text style={[st.dedupeHint, { color: data.Colors.textTertiary, fontSize: fs(12) }]}>
          {feed.displayedCount} von {feed.allDocsCount} angezeigt · Ähnliche Belege zusammengefasst
        </Text>
      ) : null}

      {!headerOnly && feed.showExpandAffordance ? (
        <TouchableOpacity
          onPress={onShowAll}
          style={st.allLink}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <Text style={[st.allLinkLabel, { color: data.Colors.primary }]}>
            {T('home.show_all_documents', { n: feed.allDocsCount })}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function useHomeFeedPrefetch(
  prefetchDocIds: string[],
  sichtbareDocs: HomeRecentListData['sichtbareDocs'],
) {
  const queryClient = useQueryClient();
  const sectionDokIds = prefetchDocIds.join(',');

  useEffect(() => {
    const topId = prefetchDocIds[0];
    if (!topId) return;
    const dok = sichtbareDocs?.find(d => d.id === topId);
    if (!dok) return;
    const timer = setTimeout(() => {
      prefetchDocumentData(queryClient, dok);
    }, 800);
    return () => clearTimeout(timer);
  }, [sectionDokIds, queryClient, prefetchDocIds, sichtbareDocs]);
}

const st = StyleSheet.create({
  wrap: {
    paddingBottom: 8,
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
