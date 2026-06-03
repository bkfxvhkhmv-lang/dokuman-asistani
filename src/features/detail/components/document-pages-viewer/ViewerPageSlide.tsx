import React, { useState } from 'react';
import { View, Text, Image, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import Pdf from 'react-native-pdf';
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

  if (isPdf) {
    return (
      <View style={[st.pageWrap, { width: W, flex: 1, backgroundColor: '#1a1a1a' }]}>
        {pdfError ? (
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
