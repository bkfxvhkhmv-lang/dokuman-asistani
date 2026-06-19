import React, { useCallback, useEffect, useRef } from 'react';
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

function areFeedRowPropsEqual(prev: HomeFeedRowProps, next: HomeFeedRowProps): boolean {
  if (prev.item !== next.item) return false;
  if (prev.onOpen !== next.onOpen) return false;
  if (prev.onNavigate !== next.onNavigate) return false;
  if (prev.data.secilenModus !== next.data.secilenModus) return false;
  // Only re-render if THIS item's selection state changed — not the whole secilenIds set.
  const id = prev.item.type === 'stack' ? prev.item.stack.lead.id : prev.item.dok.id;
  return !!prev.data.secilenIds?.has?.(id) === !!next.data.secilenIds?.has?.(id);
}

export const HomeFeedRow = React.memo(
  function HomeFeedRowInner({ item, data, onOpen, onNavigate }: HomeFeedRowProps) {
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
  },
  areFeedRowPropsEqual,
);

export function useHomeFeedRowHandlers(data: HomeRecentListData) {
  const router = useRouter();
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const navigateWithHero = useCallback(
    (dokId: string) => {
      router.push({ pathname: '/detail', params: { dokId } });
    },
    [router],
  );

  // Reads latest data via ref so the callback reference stays stable across dispatches.
  const openFromList = useCallback(
    (dok: Dokument) => {
      if (dataRef.current.secilenModus) {
        Haptics.selectionAsync();
        dataRef.current.handleSecim(dok);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigateWithHero(dok.id);
      }
    },
    [navigateWithHero],
  );

  return { openFromList, navigateWithHero };
}
