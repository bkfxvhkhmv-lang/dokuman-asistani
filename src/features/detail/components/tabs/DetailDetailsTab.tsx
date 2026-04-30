import React from 'react';
import { ScrollView } from 'react-native';
import DetailsPanel from '@/features/detail/components/DetailsPanel';
import SmartLinksPanel from '@/components/SmartLinksPanel';

type Props = {
  smartLinks: any;
  allDoksMap: Map<string, { titel: string; typ: string; absender: string }>;
  detail: any;
  onTabScroll: (e: any) => void;
  onScrollContentSize: (w: number, h: number) => void;
  onScrollLayout: (e: any) => void;
  onOpenPages?: (initialIndex?: number) => void;
  scrollBottomPadding?: number;
};

export default function DetailDetailsTab({
  smartLinks,
  allDoksMap,
  detail,
  onTabScroll,
  onScrollContentSize,
  onScrollLayout,
  onOpenPages,
  scrollBottomPadding = 132,
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
      {smartLinks && <SmartLinksPanel result={smartLinks} allDoksMap={allDoksMap} />}
      <DetailsPanel
        dok={detail.dok}
        mevcutEtiketten={detail.mevcutEtiketten}
        extrahierteFelder={detail.extrahierteFelder}
        aehnlicheDoks={detail.aehnlicheDoks}
        ocrRisiken={detail.ocrRisiken}
        graph={detail.graph}
        onOpenFullscreen={onOpenPages ? () => onOpenPages(0) : undefined}
      />
    </ScrollView>
  );
}
