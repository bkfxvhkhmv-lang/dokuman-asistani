import React, { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { Dokument } from '@/store';
import SwipeableDokumentKarte from '@/components/SwipeableDokumentKarte';
import StackedDokumentKarte from '@/components/StackedDokumentKarte';
import type { HomeFeedItem } from '@/features/home/feed/homeFeedTypes';
import type { HomeRecentListData } from '@/features/home/hooks/useHomeRecentListState';

export interface HomeFeedRowProps {
  item: HomeFeedItem;
  data: HomeRecentListData;
  onOpen: (dok: Dokument) => void;
  onNavigate: (dokId: string) => void;
}

export function HomeFeedRow({ item, data, onOpen, onNavigate }: HomeFeedRowProps) {
  if (item.type === 'stack') {
    return (
      <StackedDokumentKarte
        stack={item.stack}
        onPress={onOpen}
        onLongPressDok={dok => data.handleLongPress(dok)}
        onErledigt={data.handleSwipeErledigt}
        secilen={!!data.secilenIds?.has?.(item.stack.lead.id)}
        isSelectionMode={!!data.secilenModus}
      />
    );
  }

  return (
    <SwipeableDokumentKarte
      dok={item.dok}
      secilen={!!data.secilenIds?.has?.(item.dok.id)}
      onPress={() => onOpen(item.dok)}
      onLongPress={() => data.handleLongPress(item.dok)}
      onErledigt={data.handleSwipeErledigt}
      onContextAction={d => onNavigate(d.id)}
    />
  );
}

export function useHomeFeedRowHandlers(data: HomeRecentListData) {
  const router = useRouter();

  const navigateWithHero = useCallback(
    (dokId: string) => {
      router.push({ pathname: '/detail', params: { dokId } });
    },
    [router],
  );

  const openFromList = useCallback(
    (dok: Dokument) => {
      if (data.secilenModus) {
        Haptics.selectionAsync();
        data.handleSecim(dok);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigateWithHero(dok.id);
      }
    },
    [data, navigateWithHero],
  );

  return { openFromList, navigateWithHero };
}
