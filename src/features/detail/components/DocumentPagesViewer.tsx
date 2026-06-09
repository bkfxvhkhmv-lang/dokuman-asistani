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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { setPrivacyGateBypassed } from '@/hooks/privacyGateBypass';

import EmptyPagesModal from '@/features/detail/components/document-pages-viewer/EmptyPagesModal';
import ViewerTopBar from '@/features/detail/components/document-pages-viewer/ViewerTopBar';
import ViewerPageSlide from '@/features/detail/components/document-pages-viewer/ViewerPageSlide';
import ThumbStrip from '@/features/detail/components/document-pages-viewer/ThumbStrip';
import { Dimensions } from 'react-native';
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const [active, setActive] = useState(initialIndex);
  const [missingPages, setMissingPages] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(true);

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.order - b.order),
    [pages],
  );
  const isSinglePage = sortedPages.length === 1;

  useEffect(() => {
    if (!visible) return;
    const idx = Math.min(initialIndex, Math.max(0, sortedPages.length - 1));
    setActive(idx);
    if (!isSinglePage) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: false });
      });
    }

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
  }, [visible, sortedPages.length, isSinglePage, initialIndex]);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActive(curr => (idx !== curr ? idx : curr));
  }, []);

  const goToPage = useCallback((idx: number) => {
    setActive(idx);
    if (!isSinglePage) {
      scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
    }
  }, [isSinglePage]);

  const handleShare = useCallback(async () => {
    if (onShare) { onShare(); return; }
    const page = sortedPages[active];
    if (!page) return;
    // Android share sheet pushes app to background → privacy gate arms without this bypass.
    setPrivacyGateBypassed(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(page.uri, {
          dialogTitle: `Seite ${active + 1}`,
        });
      }
    } catch {
      // sessizce yut — sheet zaten kapanir
    } finally {
      setPrivacyGateBypassed(false);
    }
  }, [onShare, sortedPages, active]);

  const [contentHeight, setContentHeight] = useState(Dimensions.get('window').height);
  const thumbBottomPad = Math.max(12, insets.bottom + 8);
  const [pdfPageCounts, setPdfPageCounts] = useState<Record<number, number>>({});
  // Per-page rotation state (degrees, UI-only — not persisted)
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const handleRotate = useCallback(() => {
    setRotations(prev => ({ ...prev, [active]: ((prev[active] ?? 0) + 90) % 360 }));
  }, [active]);
  const effectivePageCount = pdfPageCounts[active] ?? sortedPages.length;

  if (sortedPages.length === 0) {
    return <EmptyPagesModal visible={visible} onClose={onClose} />;
  }

  return (
    <Modal visible={mounted} animationType="fade" presentationStyle="overFullScreen" transparent>
      {mounted && (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={st.root}>
          <ViewerTopBar
            activeIndex={active}
            pageCount={effectivePageCount}
            onClose={onClose}
            onShare={handleShare}
            onRotate={handleRotate}
          />

          <View
            style={{ flex: 1 }}
            onLayout={e => setContentHeight(e.nativeEvent.layout.height)}
          >
            {verifying && (
              <View style={st.verifyOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}

            {isSinglePage ? (
              <View style={[st.swiper, { flex: 1 }]}>
                <ViewerPageSlide
                  key={sortedPages[0].id}
                  uri={sortedPages[0].uri}
                  isMissing={missingPages.has(sortedPages[0].id)}
                  availableHeight={contentHeight}
                  onPdfPageCount={(n) => setPdfPageCounts(prev => ({ ...prev, [0]: n }))}
                  rotation={rotations[0] ?? 0}
                />
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                style={st.swiper}
                contentContainerStyle={{ alignItems: 'center' }}
              >
                {sortedPages.map((page, idx) => (
                  <ViewerPageSlide
                    key={page.id}
                    uri={page.uri}
                    isMissing={missingPages.has(page.id)}
                    availableHeight={contentHeight}
                    onPdfPageCount={(n) => setPdfPageCounts(prev => ({ ...prev, [idx]: n }))}
                    rotation={rotations[idx] ?? 0}
                  />
                ))}
              </ScrollView>
            )}

            {!isSinglePage && (
              <ThumbStrip
                sortedPages={sortedPages}
                active={active}
                missingPages={missingPages}
                paddingBottom={thumbBottomPad}
                onPickIndex={goToPage}
              />
            )}
          </View>
        </View>
        </GestureHandlerRootView>
      )}
    </Modal>
  );
}
