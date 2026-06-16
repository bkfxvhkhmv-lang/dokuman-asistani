import React from 'react';
import { ScrollView } from 'react-native';
import DetailsPanel from '@/features/detail/components/DetailsPanel';

import DocumentSpeechSection from '@/features/detail/components/DocumentSpeechSection';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';

type Props = {
  detail: any;
  actionPlan?: ActionPlan | null;
  isUnanalysedQuickSaved?: boolean;
  suspendPreview?: boolean;
  onTabScroll: (e: any) => void;
  onScrollContentSize: (w: number, h: number) => void;
  onScrollLayout: (e: any) => void;
  onOpenPages?: (initialIndex?: number) => void;
  scrollBottomPadding?: number;
  onEdit?: () => void;
  onExport?: () => void;
  onSign?: () => void;
  onErledigt?: () => void;
  onLoeschen?: () => void;
  onNebenkostenPruefen?: () => void;
};

export default function DetailDetailsTab({
  detail,
  actionPlan = null,
  isUnanalysedQuickSaved = false,
  suspendPreview = false,
  onTabScroll,
  onScrollContentSize,
  onScrollLayout,
  onOpenPages,
  scrollBottomPadding = 132,
  onEdit,
  onExport,
  onSign,
  onErledigt,
  onLoeschen,
  onNebenkostenPruefen,
}: Props) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: scrollBottomPadding }}
      scrollEventThrottle={16}
      onScroll={onTabScroll}
      onContentSizeChange={onScrollContentSize}
      onLayout={onScrollLayout}
    >

      <DetailsPanel
        dok={detail.dok}
        mevcutEtiketten={detail.mevcutEtiketten}
        extrahierteFelder={detail.extrahierteFelder}
        aehnlicheDoks={detail.aehnlicheDoks}
        ocrRisiken={detail.ocrRisiken}
        graph={detail.graph}
        suspendPreview={suspendPreview}
        onOpenFullscreen={onOpenPages ? () => onOpenPages(0) : undefined}
        onEdit={onEdit}
        onExport={onExport}
        onSign={onSign}
        onErledigt={onErledigt}
        onLoeschen={onLoeschen}
        onNebenkostenPruefen={onNebenkostenPruefen}
        isUnanalysedQuickSaved={isUnanalysedQuickSaved}
      />
      {detail.dok && !isUnanalysedQuickSaved ? (
        <DocumentSpeechSection dok={detail.dok} prominent />
      ) : null}
    </ScrollView>
  );
}
