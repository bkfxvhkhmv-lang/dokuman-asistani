import { useMemo } from 'react';
import type { Dokument } from '@/store';
import { useT } from '@/hooks/useT';
import { buildHomeFeedModel } from '@/features/home/feed/buildHomeFeedModel';
import { resolveHomeFeedSection } from '@/features/home/feed/resolveHomeFeedSection';
import type { HomeFeedModel } from '@/features/home/feed/homeFeedTypes';

export interface UseHomeFeedModelParams {
  aktiv: string;
  secilenModus: boolean;
  listQuery: string;
  showAll: boolean;
  aufgaben?: Dokument[];
  alleDocs?: Dokument[];
  ordnerDocs?: Dokument[];
  kalDocs?: Dokument[];
  zahlungsDocs?: Dokument[];
  sichtbareDocs?: Dokument[];
}

/** Adapter: Home tab docs → FlatList-ready feed model (pure build + memo). */
export function useHomeFeedModel(params: UseHomeFeedModelParams): HomeFeedModel {
  const { t: T } = useT();

  const section = useMemo(
    () =>
      resolveHomeFeedSection(
        {
          aktiv: params.aktiv,
          aufgaben: params.aufgaben,
          alleDocs: params.alleDocs,
          ordnerDocs: params.ordnerDocs,
          kalDocs: params.kalDocs,
          zahlungsDocs: params.zahlungsDocs,
        },
        T,
      ),
    [
      params.aktiv,
      params.aufgaben,
      params.alleDocs,
      params.ordnerDocs,
      params.kalDocs,
      params.zahlungsDocs,
      T,
    ],
  );

  return useMemo(
    () =>
      buildHomeFeedModel({
        aktiv: params.aktiv,
        secilenModus: params.secilenModus,
        listQuery: params.listQuery,
        showAll: params.showAll,
        section,
        prefetchSource: params.sichtbareDocs,
      }),
    [
      params.aktiv,
      params.secilenModus,
      params.listQuery,
      params.showAll,
      params.sichtbareDocs,
      section,
    ],
  );
}
