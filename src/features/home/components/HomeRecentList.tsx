import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useHomeRecentListState, type HomeRecentListData } from '@/features/home/hooks/useHomeRecentListState';
import { HomeFeedRow, useHomeFeedRowHandlers } from '@/features/home/components/HomeFeedRow';
import { HomeRecentListChrome, useHomeFeedPrefetch } from '@/features/home/components/HomeRecentListChrome';

interface Props {
  data: HomeRecentListData;
}

/** Home document list — feed adapter wiring; outer Home ScrollView unchanged (PR-3 adds FlatList). */
export default function HomeRecentList({ data }: Props) {
  const { feed, listQuery, setListQuery, setShowAll } = useHomeRecentListState(data);
  const { openFromList, navigateWithHero } = useHomeFeedRowHandlers(data);

  useHomeFeedPrefetch(feed.prefetchDocIds, data.sichtbareDocs);

  if (feed.emptyReason) {
    return (
      <View style={st.root}>
        <HomeRecentListChrome
          data={data}
          feed={feed}
          listQuery={listQuery}
          onListQueryChange={setListQuery}
          onShowAll={() => setShowAll(true)}
        />
      </View>
    );
  }

  return (
    <View style={st.root}>
      <HomeRecentListChrome
        data={data}
        feed={feed}
        listQuery={listQuery}
        onListQueryChange={setListQuery}
        onShowAll={() => setShowAll(true)}
        headerOnly
      />
      <View>
        {feed.items.map(item => (
          <HomeFeedRow
            key={item.key}
            item={item}
            data={data}
            onOpen={openFromList}
            onNavigate={navigateWithHero}
          />
        ))}
      </View>
      <HomeRecentListChrome
        data={data}
        feed={feed}
        listQuery={listQuery}
        onListQueryChange={setListQuery}
        onShowAll={() => setShowAll(true)}
        expandFooterOnly
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    paddingBottom: 24,
  },
});

export type { HomeRecentListData };
