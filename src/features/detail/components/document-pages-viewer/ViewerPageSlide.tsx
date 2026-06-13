import React, { useEffect, useState } from 'react';
import { View, Text, Image, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Icon from '@/components/Icon';
import DocumentMagnifier from '@/components/DocumentMagnifier';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

interface Props {
  uri: string;
  isMissing: boolean;
  availableHeight?: number;
  onPdfPageCount?: (count: number) => void;
  rotation?: number; // degrees, multiples of 90
}

const WINDOW = Dimensions.get('window');

// Simple deterministic hash to reuse cache files for the same source URI.
function hashUri(uri: string): string {
  let h = 0;
  for (let i = 0; i < uri.length; i++) {
    h = ((h << 5) - h) + uri.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
}

// Android: PdfRendererView requires a file:// URI — resolve content:// by copying to cache.
async function resolveAndroidPdfUri(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('/')) {
    return uri.startsWith('/') ? `file://${uri}` : uri;
  }
  if (uri.startsWith('content://')) {
    const dest = `${FileSystem.cacheDirectory}briefpilot_pdf_${hashUri(uri)}.pdf`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
  return uri;
}

// Android-only internal component: uses native PdfRenderer API (no gesture conflict).
function AndroidPdfSlide({
  uri, W, rotation, onPdfPageCount,
}: { uri: string; W: number; rotation: number; onPdfPageCount?: (n: number) => void }) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [reportedTotal, setReportedTotal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    setError(false);
    setReportedTotal(false);
    resolveAndroidPdfUri(uri)
      .then(u => { if (!cancelled) setResolved(u); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [uri]);

  if (error) {
    return (
      <PdfErrorSlide uri={uri} />
    );
  }

  if (!resolved) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="rgba(255,255,255,0.6)" size="large" />
      </View>
    );
  }

  // Lazy import keeps the Android-only module out of the iOS bundle evaluation path.
  const PdfRendererView = require('react-native-pdf-renderer').default;

  return (
    <View style={[{ width: W, flex: 1 }, rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined]}>
      <PdfRendererView
        source={resolved}
        style={{ flex: 1 }}
        maxZoom={5}
        distanceBetweenPages={16}
        onPageChange={(_current: number, total: number) => {
          if (!reportedTotal) {
            onPdfPageCount?.(total);
            setReportedTotal(true);
          }
        }}
        onError={() => setError(true)}
      />
    </View>
  );
}

function PdfErrorSlide({ uri }: { uri: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 14, paddingHorizontal: 32 }}>
      <Icon name="alert-circle" size={36} color="rgba(255,255,255,0.5)" />
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
        PDF konnte nicht angezeigt werden.
      </Text>
      <TouchableOpacity
        onPress={() => void Sharing.shareAsync(uri)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{
          paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>PDF extern öffnen</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ViewerPageSlide({ uri, isMissing, availableHeight, onPdfPageCount, rotation = 0 }: Props) {
  const [pdfError, setPdfError] = useState(false);

  const W = WINDOW.width;
  const H = availableHeight ?? WINDOW.height * 0.88;

  if (isMissing) {
    return (
      <View style={[st.pageWrap, { width: W, height: H }]}>
        <View style={st.missingCard}>
          <Icon name="alert-circle" size={36} color="#F87171" />
          <Text style={st.missingTitle}>Seite nicht mehr verfügbar</Text>
          <Text style={st.missingHint}>
            Die Datei wurde wahrscheinlich vom System entfernt. Bitte
            neu scannen oder löschen.
          </Text>
        </View>
      </View>
    );
  }

  const isPdf = uri.toLowerCase().endsWith('.pdf');

  // Android: real PDF → PdfRendererView (native PdfRenderer API, pinch zoom works)
  if (Platform.OS === 'android' && isPdf) {
    return (
      <View style={[st.pageWrap, { width: W, flex: 1, backgroundColor: '#1a1a1a' }]}>
        <AndroidPdfSlide uri={uri} W={W} rotation={rotation} onPdfPageCount={onPdfPageCount} />
      </View>
    );
  }

  // iOS + all image pages: existing path unchanged
  if (isPdf) {
    return (
      <View style={[st.pageWrap, { width: W, flex: 1, backgroundColor: '#1a1a1a' }]}>
        {pdfError ? (
          <PdfErrorSlide uri={uri} />
        ) : (
          <Pdf
            source={{ uri, cache: true }}
            style={[{ width: W, flex: 1 }, rotation ? { transform: [{ rotate: `${rotation}deg` }] } : null]}
            enablePaging={false}
            horizontal={false}
            renderActivityIndicator={() => <ActivityIndicator color="rgba(255,255,255,0.6)" size="large" />}
            onError={() => setPdfError(true)}
            onLoadComplete={(numberOfPages) => onPdfPageCount?.(numberOfPages)}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[st.pageWrap, { width: W, height: H }]}>
      <ScrollView
        style={{ width: W, height: H }}
        contentContainerStyle={{ width: W, height: H }}
        maximumZoomScale={4}
        minimumZoomScale={1}
        bouncesZoom
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        centerContent
      >
        <Image
          source={{ uri }}
          style={{ width: W, height: H, transform: rotation ? [{ rotate: `${rotation}deg` }] : [] }}
          resizeMode="contain"
        />
        <DocumentMagnifier uri={uri} containerWidth={W} containerHeight={H} />
      </ScrollView>
    </View>
  );
}
