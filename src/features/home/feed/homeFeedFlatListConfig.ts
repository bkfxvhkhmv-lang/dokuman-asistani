import { Platform } from 'react-native';
import type { FlatListProps } from 'react-native';
import type { HomeFeedItem } from '@/features/home/feed/homeFeedTypes';

const CARD_ROW_HEIGHT = 132;

/** Root Home FlatList tuning — measure on device before merge. */
export function getHomeFeedFlatListProps(useStacking: boolean): Partial<FlatListProps<HomeFeedItem>> {
  const base: Partial<FlatListProps<HomeFeedItem>> = {
    initialNumToRender: 8,
    maxToRenderPerBatch: 8,
    windowSize: 7,
    updateCellsBatchingPeriod: 32,
    removeClippedSubviews: Platform.OS === 'android',
  };
  if (useStacking) return base;
  return {
    ...base,
    getItemLayout: (_data, index) => ({
      length: CARD_ROW_HEIGHT,
      offset: CARD_ROW_HEIGHT * index,
      index,
    }),
  };
}
