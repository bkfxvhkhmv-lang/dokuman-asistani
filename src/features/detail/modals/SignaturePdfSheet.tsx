import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import Pdf from 'react-native-pdf';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { PDFDocument } from 'pdf-lib';

import type { Dokument } from '@/store';
import { AppSheet } from '@/design/components';
import { useTheme } from '@/ThemeContext';
import { detailModalStyles as st } from '@/features/detail/detail-modals/styles';
import { exportierePDFZuDatei } from '@/utils/exporters';
import { readUriBytes } from '@/core/pdf/js-pdf-generate/bytes';
import { stampRasterOnPdfPage } from '@/core/pdf/jsPdfGenerate';
import { buildPdfExportBasename } from '@/utils/exportFilename';

interface Props {
  visible: boolean;
  onClose: () => void;
  dok: Dokument;
  onDone?: () => void;
}

type Step = 'draw' | 'place';

type PageSize = { width: number; height: number };

type SignatureBox = { x: number; y: number; width: number; height: number };

type Rect = { x: number; y: number; width: number; height: number };

async function inspectPdfPages(pdfUri: string): Promise<PageSize[]> {
  const rawPdf = await readUriBytes(pdfUri);
  const doc = await PDFDocument.load(rawPdf, { ignoreEncryption: true });
  return doc.getPages().map(page => page.getSize());
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pageRectWithin(container: { width: number; height: number }, page: PageSize): Rect {
  const scale = Math.min(container.width / page.width, container.height / page.height);
  const width = page.width * scale;
  const height = page.height * scale;
  return {
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
    width,
    height,
  };
}

function defaultSignatureBox(rect: Rect): SignatureBox {
  const width = rect.width * 0.34;
  const height = width * 0.42;
  return {
    x: rect.x + rect.width * 0.52,
    y: rect.y + rect.height * 0.72,
    width,
    height,
  };
}

function mapBoxToPdf(rect: Rect, box: SignatureBox, page: PageSize) {
  const relX = clamp((box.x - rect.x) / rect.width, 0, 1);
  const relY = clamp((box.y - rect.y) / rect.height, 0, 1);
  const relW = clamp(box.width / rect.width, 0.05, 1);
  const relH = clamp(box.height / rect.height, 0.03, 1);

  const pdfX = relX * page.width;
  const pdfWidth = relW * page.width;
  const pdfHeight = relH * page.height;
  const pdfY = page.height - ((relY + relH) * page.height);

  return {
    x: clamp(pdfX, 0, Math.max(0, page.width - pdfWidth)),
    y: clamp(pdfY, 0, Math.max(0, page.height - pdfHeight)),
    width: pdfWidth,
    height: pdfHeight,
  };
}

export default function SignaturePdfSheet({ visible, onClose, dok, onDone }: Props) {
  const { Colors: C } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const padRef = useRef<View>(null);
  const dragStartRef = useRef<SignatureBox | null>(null);
  const signatureBoxRef = useRef<SignatureBox | null>(null);
  const currentPageRectRef = useRef<Rect | null>(null);

  const [step, setStep] = useState<Step>('draw');
  const [busy, setBusy] = useState(false);
  const [paths, setPaths] = useState<[number, number][][]>([]);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [signatureBox, setSignatureBox] = useState<SignatureBox | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  const previewWidth = Math.min(screenW - 48, 420);
  const previewHeight = Math.min(Math.round(previewWidth * 1.38), 560);
  const padWidth = previewWidth;
  const padHeight = 220;
  const canContinue = paths.some(segment => segment.length >= 2);
  const activePage = pageSizes[pageIndex] ?? null;
  const currentPageRect = useMemo<Rect | null>(() => {
    if (!activePage || !previewSize.width || !previewSize.height) return null;
    return pageRectWithin(previewSize, activePage);
  }, [activePage, previewSize]);

  // Keep refs current so PanResponder callbacks don't need to be recreated
  signatureBoxRef.current = signatureBox;
  currentPageRectRef.current = currentPageRect;

  const resetAll = useCallback(() => {
    setStep('draw');
    setBusy(false);
    setPaths([]);
    setSignatureUri(null);
    setPdfUri(null);
    setPageSizes([]);
    setPageIndex(0);
    setPreviewSize({ width: 0, height: 0 });
    setSignatureBox(null);
    setPdfError(null);
    setRotation(0);
  }, []);

  useEffect(() => {
    if (!visible) resetAll();
  }, [visible, resetAll]);

  useEffect(() => {
    if (!currentPageRect || signatureBox) return;
    setSignatureBox(defaultSignatureBox(currentPageRect));
  }, [currentPageRect, signatureBox]);

  useEffect(() => {
    if (!currentPageRect || !signatureBox) return;
    setSignatureBox(prev => {
      if (!prev) return prev;
      const width = Math.min(prev.width, currentPageRect.width);
      const height = Math.min(prev.height, currentPageRect.height);
      return {
        width,
        height,
        x: clamp(prev.x, currentPageRect.x, currentPageRect.x + currentPageRect.width - width),
        y: clamp(prev.y, currentPageRect.y, currentPageRect.y + currentPageRect.height - height),
      };
    });
  }, [currentPageRect, pageIndex]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Never yield the gesture to parent (AppSheet swipe-to-close)
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: evt => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          setPaths(prev => [...prev, [[x, y]]]);
        },
        onPanResponderMove: evt => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          setPaths(prev => {
            if (!prev.length) return prev;
            const next = [...prev];
            const last = next.length - 1;
            next[last] = [...next[last], [x, y]];
            return next;
          });
        },
      }),
    [], // no deps needed — never changes
  );

  const placementResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragStartRef.current = signatureBoxRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const origin = dragStartRef.current;
          const rect = currentPageRectRef.current;
          if (!origin || !rect) return;
          setSignatureBox({
            ...origin,
            x: clamp(origin.x + gesture.dx, rect.x, rect.x + rect.width - origin.width),
            y: clamp(origin.y + gesture.dy, rect.y, rect.y + rect.height - origin.height),
          });
        },
        onPanResponderRelease: () => { dragStartRef.current = null; },
        onPanResponderTerminate: () => { dragStartRef.current = null; },
      }),
    [],
  );

  const handleClear = useCallback(() => setPaths([]), []);

  const handleContinue = useCallback(async () => {
    if (!canContinue || !padRef.current) return;

    setBusy(true);
    try {
      const [capturedSignatureUri, generatedPdfUri] = await Promise.all([
        captureRef(padRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        }),
        exportierePDFZuDatei(dok),
      ]);

      const pages = await inspectPdfPages(generatedPdfUri);
      if (!pages.length) throw new Error('PDF hat keine Seiten.');

      setSignatureUri(capturedSignatureUri);
      setPdfUri(generatedPdfUri);
      setPageSizes(pages);
      setPageIndex(0);
      setSignatureBox(null);
      setPdfError(null);
      setStep('place');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('[SignaturePdfSheet] continue failed', error);
      Alert.alert('Fehler', 'PDF konnte nicht vorbereitet werden.');
    } finally {
      setBusy(false);
    }
  }, [canContinue, dok]);

  const resizeSignature = useCallback((factor: number) => {
    if (!signatureBox || !currentPageRect) return;
    const nextWidth = clamp(signatureBox.width * factor, currentPageRect.width * 0.14, currentPageRect.width * 0.7);
    const nextHeight = clamp(signatureBox.height * factor, currentPageRect.height * 0.06, currentPageRect.height * 0.32);
    setSignatureBox({
      width: nextWidth,
      height: nextHeight,
      x: clamp(signatureBox.x, currentPageRect.x, currentPageRect.x + currentPageRect.width - nextWidth),
      y: clamp(signatureBox.y, currentPageRect.y, currentPageRect.y + currentPageRect.height - nextHeight),
    });
  }, [signatureBox, currentPageRect]);

  const handleSave = useCallback(async () => {
    if (!pdfUri || !signatureUri || !signatureBox || !currentPageRect || !activePage) return;

    setBusy(true);
    try {
      const pdfBox = mapBoxToPdf(currentPageRect, signatureBox, activePage);
      const stamped = await stampRasterOnPdfPage(pdfUri, signatureUri, {
        pageIndex,
        ...pdfBox,
        rotateDeg: rotation || undefined,
      });

      if (!stamped?.uri) {
        Alert.alert('Fehler', 'PDF konnte nicht unterschrieben werden.');
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(stamped.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${buildPdfExportBasename(dok)}.pdf`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Fertig', 'Das unterschriebene PDF wurde erstellt.');
      }

      onDone?.();
      onClose();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('[SignaturePdfSheet] save failed', error);
      Alert.alert('Fehler', 'PDF konnte nicht unterschrieben werden.');
    } finally {
      setBusy(false);
    }
  }, [activePage, currentPageRect, dok, onClose, onDone, pageIndex, pdfUri, signatureBox, signatureUri]);

  const handlePreviewLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPreviewSize({ width, height });
  }, []);

  const footer = step === 'draw' ? (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <TouchableOpacity
        onPress={handleClear}
        disabled={busy || !paths.length}
        style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy || !paths.length ? 0.5 : 1 }]}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Löschen</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onClose}
        disabled={busy}
        style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy ? 0.5 : 1 }]}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Abbrechen</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleContinue}
        disabled={busy || !canContinue}
        style={[st.sheetButton, { backgroundColor: C.primaryLight, borderColor: C.primary, opacity: busy || !canContinue ? 0.5 : 1 }]}
      >
        {busy ? <ActivityIndicator color={C.primaryDark} /> : (
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>Weiter</Text>
        )}
      </TouchableOpacity>
    </View>
  ) : (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => resizeSignature(0.9)}
          disabled={busy || !signatureBox}
          style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy || !signatureBox ? 0.5 : 1 }]}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => resizeSignature(1.1)}
          disabled={busy || !signatureBox}
          style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy || !signatureBox ? 0.5 : 1 }]}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRotation(r => ((r + 90) % 360) as 0 | 90 | 180 | 270)}
          disabled={busy}
          style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>↻ Drehen</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={() => {
            setStep('draw');
            setBusy(false);
            setPaths([]);
            setSignatureUri(null);
            setSignatureBox(null);
          }}
          disabled={busy}
          style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Unterschrift neu zeichnen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          disabled={busy}
          style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={busy || !signatureUri || !pdfUri || !signatureBox}
          style={[st.sheetButton, { backgroundColor: C.primaryLight, borderColor: C.primary, opacity: busy || !signatureUri || !pdfUri || !signatureBox ? 0.5 : 1 }]}
        >
          {busy ? <ActivityIndicator color={C.primaryDark} /> : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>PDF speichern</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="PDF unterschreiben"
      subtitle={
        step === 'draw'
          ? 'Unterschrift zeichnen'
          : 'Ziehe die Unterschrift an die richtige Stelle im Dokument.'
      }
      footer={footer}
    >
      {step === 'draw' ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, lineHeight: 19, color: C.textSecondary }}>
            Zeichne deine Unterschrift einmal sauber. Danach platzierst du sie im Dokument.
          </Text>
          <View
            ref={padRef}
            collapsable={false}
            {...panResponder.panHandlers}
            style={{
              width: padWidth,
              maxWidth: '100%',
              height: padHeight,
              alignSelf: 'center',
              borderRadius: 16,
              borderWidth: 0.5,
              borderColor: C.border,
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            <Svg width={padWidth} height={padHeight}>
              {paths.map((pts, idx) => (
                <Polyline
                  key={idx}
                  points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="none"
                  stroke="#111827"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, lineHeight: 19, color: C.textSecondary }}>
            Ziehe die Unterschrift an die richtige Stelle im Dokument und passe bei Bedarf die Größe an.
          </Text>

          {pageSizes.length > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setPageIndex(prev => clamp(prev - 1, 0, pageSizes.length - 1))}
                disabled={busy || pageIndex === 0}
                style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy || pageIndex === 0 ? 0.5 : 1 }]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Zurück</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSecondary }}>
                Seite {pageIndex + 1} / {pageSizes.length}
              </Text>
              <TouchableOpacity
                onPress={() => setPageIndex(prev => clamp(prev + 1, 0, pageSizes.length - 1))}
                disabled={busy || pageIndex === pageSizes.length - 1}
                style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy || pageIndex === pageSizes.length - 1 ? 0.5 : 1 }]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Weiter</Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            onLayout={handlePreviewLayout}
            style={{
              width: previewWidth,
              height: previewHeight,
              alignSelf: 'center',
              borderRadius: 18,
              overflow: 'hidden',
              backgroundColor: '#0F1115',
              borderWidth: 0.5,
              borderColor: C.border,
            }}
          >
            {pdfUri ? (
              <>
                <Pdf
                  source={{ uri: pdfUri, cache: true }}
                  page={pageIndex + 1}
                  style={{ flex: 1, width: '100%', height: '100%' }}
                  fitPolicy={2}
                  scrollEnabled={false}
                  onError={(e) => setPdfError(String((e as any)?.message ?? e))}
                />
                {!!signatureUri && !!signatureBox && (
                  <View
                    {...placementResponder.panHandlers}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    style={{
                      position: 'absolute',
                      left: signatureBox.x,
                      top: signatureBox.y,
                      width: signatureBox.width,
                      height: signatureBox.height,
                      borderWidth: 1.5,
                      borderColor: C.primary,
                      borderStyle: 'dashed',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Image
                      source={{ uri: signatureUri }}
                      style={{ width: '100%', height: '100%', transform: [{ rotate: `${rotation}deg` }] }}
                      resizeMode="contain"
                    />
                    {/* Corner handles for visual feedback */}
                    {[
                      { top: -4, left: -4 },
                      { top: -4, right: -4 },
                      { bottom: -4, left: -4 },
                      { bottom: -4, right: -4 },
                    ].map((pos, i) => (
                      <View key={i} style={{
                        position: 'absolute', ...pos,
                        width: 10, height: 10,
                        borderRadius: 2,
                        backgroundColor: C.primary,
                      }} />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.primary} />
              </View>
            )}
          </View>

          {!!pdfError && (
            <Text style={{ fontSize: 12, color: C.danger }}>
              PDF konnte nicht angezeigt werden: {pdfError}
            </Text>
          )}
        </View>
      )}
    </AppSheet>
  );
}
