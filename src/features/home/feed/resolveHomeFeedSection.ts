import type { Dokument } from '@/store';
import {
  getDocumentsSectionEyebrow,
  getDocumentsSectionSubline,
} from '@/product/strategyCopy';
import type { HomeFeedSection } from '@/features/home/feed/homeFeedTypes';

export interface HomeFeedSectionSources {
  aktiv: string;
  aufgaben?: Dokument[];
  alleDocs?: Dokument[];
  ordnerDocs?: Dokument[];
  kalDocs?: Dokument[];
  zahlungsDocs?: Dokument[];
}

type Translate = (key: string) => string;

/** Resolves tab-specific section metadata + doc list (UI/i18n boundary). */
export function resolveHomeFeedSection(
  sources: HomeFeedSectionSources,
  T: Translate,
): HomeFeedSection {
  const map: Record<string, HomeFeedSection> = {
    Aufgaben: {
      title: T('detail.section.tasks'),
      eyebrow: T('detail.status.action_needed'),
      docs: sources.aufgaben ?? [],
    },
    Dokumente: {
      title: T('home.recent'),
      eyebrow: getDocumentsSectionEyebrow(),
      subtitle: getDocumentsSectionSubline(),
      docs: sources.alleDocs ?? [],
    },
    Ordner: {
      title: T('empty.title'),
      eyebrow: T('field.type'),
      docs: sources.ordnerDocs?.length ? sources.ordnerDocs! : sources.alleDocs ?? [],
    },
    Kalender: {
      title: T('field.deadline'),
      eyebrow: T('doc.this_week'),
      docs: sources.kalDocs ?? [],
    },
    Zahlungen: {
      title: T('field.amount'),
      eyebrow: T('dash.amount'),
      docs: (sources.zahlungsDocs ?? []).slice(2),
    },
  };

  return map[sources.aktiv] ?? map.Dokumente;
}
