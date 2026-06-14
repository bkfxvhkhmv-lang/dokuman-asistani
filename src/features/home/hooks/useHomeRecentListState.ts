import { useState } from 'react';
import type { Dokument } from '@/store';
import { useHomeFeedModel } from '@/features/home/feed/useHomeFeedModel';
import type { HomeFeedModel } from '@/features/home/feed/homeFeedTypes';

export interface HomeRecentListData {
  aktiv: string;
  secilenModus: boolean;
  aufgaben?: Dokument[];
  alleDocs?: Dokument[];
  ordnerDocs?: Dokument[];
  kalDocs?: Dokument[];
  zahlungsDocs?: Dokument[];
  sichtbareDocs?: Dokument[];
  secilenIds?: Set<string>;
  Colors: { text: string; primary: string; textTertiary: string };
  handleSecim: (dok: Dokument) => void;
  secimiBaslat: () => void;
  secimiIptal: () => void;
  handleLongPress: (dok: Dokument) => void;
  handleSwipeErledigt: (dok: Dokument) => void;
}

export interface HomeRecentListState {
  feed: HomeFeedModel;
  listQuery: string;
  setListQuery: (q: string) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
}

export function useHomeRecentListState(data: HomeRecentListData): HomeRecentListState {
  const [showAll, setShowAll] = useState(false);
  const [listQuery, setListQuery] = useState('');

  const feed = useHomeFeedModel({
    aktiv: data.aktiv,
    secilenModus: data.secilenModus,
    listQuery,
    showAll,
    aufgaben: data.aufgaben,
    alleDocs: data.alleDocs,
    ordnerDocs: data.ordnerDocs,
    kalDocs: data.kalDocs,
    zahlungsDocs: data.zahlungsDocs,
    sichtbareDocs: data.sichtbareDocs,
  });

  return { feed, listQuery, setListQuery, showAll, setShowAll };
}
