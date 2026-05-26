import React from 'react';
import { ScrollView } from 'react-native';
import DetailsPanel from '@/features/detail/components/DetailsPanel';

type Props = {
  detail: any;
  onTabScroll: (e: any) => void;
  onScrollContentSize: (w: number, h: number) => void;
  onScrollLayout: (e: any) => void;
  onOpenPages?: (initialIndex?: number) => void;
  scrollBottomPadding?: number;
  onEdit?: () => void;
  onExport?: () => void;
  onLoeschen?: () => void;
};

export default function DetailDetailsTab({
  detail,
  onTabScroll,
  onScrollContentSize,
  onScrollLayout,
  onOpenPages,
  scrollBottomPadding = 132,
  onEdit,
  onExport,
  onLoeschen,
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
        onOpenFullscreen={onOpenPages ? () => onOpenPages(0) : undefined}
        onEdit={onEdit}
        onExport={onExport}
        onLoeschen={onLoeschen}
      />
    </ScrollView>
  );
}
