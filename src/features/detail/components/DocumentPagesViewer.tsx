/**
 * DocumentPagesViewer — Detail ekranindan acilan tam ekran sayfa
 * goruntuleyici.
 *
 * Davraniş orchestrator’da; parçalar `document-pages-viewer/` altında.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Modal, View, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import EmptyPagesModal from '@/features/detail/components/document-pages-viewer/EmptyPagesModal';
import ViewerTopBar from '@/features/detail/components/document-pages-viewer/ViewerTopBar';
import ViewerPageSlide from '@/features/detail/components/document-pages-viewer/ViewerPageSlide';
import ThumbStrip from '@/features/detail/components/document-pages-viewer/ThumbStrip';
import { SCREEN_W } from '@/features/detail/components/document-pages-viewer/constants';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

import type { DocumentPagesViewerProps } from '@/features/detail/components/document-pages-viewer/types';

export type { DocumentPagesViewerProps };

export default function DocumentPagesViewer({
  visible,
  pages,
  initialIndex = 0,
  onClose,
  onShare,
}: DocumentPagesViewerProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(initialIndex);
  const [missingPages, setMissingPages] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(true);

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.order - b.order),
    [pages],
  );

  useEffect(() => {
    if (!visible) return;
    const idx = Math.min(initialIndex, Math.max(0, sortedPages.length - 1));
    setActive(idx);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: false });
    });

    let cancelled = false;
    setVerifying(true);
    (async () => {
      const missing = new Set<string>();
      for (const p of sortedPages) {
        try {
          const info = await FileSystem.getInfoAsync(p.uri);
          if (!info.exists) missing.add(p.id);
        } catch {
          missing.add(p.id);
        }
      }
      if (!cancelled) {
        setMissingPages(missing);
        setVerifying(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sortedPages.length]);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActive(curr => (idx !== curr ? idx : curr));
  }, []);

  const goToPage = useCallback((idx: number) => {
    setActive(idx);
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
  }, []);

  const handleShare = useCallback(async () => {
    if (onShare) { onShare(); return; }
    const page = sortedPages[active];
    if (!page) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(page.uri, {
          dialogTitle: `Seite ${active + 1}`,
        });
      }
    } catch {
      // sessizce yut — sheet zaten kapanir
    }
  }, [onShare, sortedPages, active]);

  const topPadding = Math.max(12, insets.top + 8);
  const thumbBottomPad = Math.max(12, insets.bottom + 8);

  if (sortedPages.length === 0) {
    return <EmptyPagesModal visible={visible} onClose={onClose} />;
  }

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" transparent>
      <View style={st.root}>
        <ViewerTopBar
          paddingTop={topPadding}
          activeIndex={active}
          pageCount={sortedPages.length}
          onClose={onClose}
          onShare={handleShare}
        />

        {verifying && (
          <View style={st.verifyOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={st.swiper}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {sortedPages.map(page => (
            <ViewerPageSlide
              key={page.id}
              uri={page.uri}
              isMissing={missingPages.has(page.id)}
            />
          ))}
        </ScrollView>

        {sortedPages.length >= 2 && (
          <ThumbStrip
            sortedPages={sortedPages}
            active={active}
            missingPages={missingPages}
            paddingBottom={thumbBottomPad}
            onPickIndex={goToPage}
          />
        )}
      </View>
    </Modal>
  );
}
