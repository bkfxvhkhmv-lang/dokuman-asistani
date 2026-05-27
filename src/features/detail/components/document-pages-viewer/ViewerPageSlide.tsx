import React, { useState } from 'react';
import { View, Text, Image, Dimensions, ActivityIndicator, TouchableOpacity, type LayoutRectangle } from 'react-native';
import Pdf from 'react-native-pdf';
import * as Sharing from 'expo-sharing';
import Icon from '@/components/Icon';
import DocumentMagnifier from '@/components/DocumentMagnifier';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

interface Props {
  uri: string;
  isMissing: boolean;
}

const WINDOW = Dimensions.get('window');

export default function ViewerPageSlide({ uri, isMissing }: Props) {
  const [viewport, setViewport] = useState<LayoutRectangle | null>(null);
  const [pdfError, setPdfError] = useState(false);

  const imgW = viewport && viewport.width > 40 ? viewport.width : WINDOW.width;
  const imgH = viewport && viewport.height > 40 ? viewport.height : WINDOW.height * 0.82;

  if (isMissing) {
    return (
      <View style={st.pageWrap}>
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
      <View
        style={[st.pageWrap, { backgroundColor: '#1a1a1a' }]}
        onLayout={e => setViewport(e.nativeEvent.layout)}
      >
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
            style={{ flex: 1, width: imgW }}
            enablePaging={false}
            horizontal={false}
            renderActivityIndicator={() => <ActivityIndicator color="rgba(255,255,255,0.6)" size="large" />}
            onError={() => setPdfError(true)}
          />
        )}
      </View>
    );
  }

  return (
    <View
      style={[st.pageWrap, { overflow: 'hidden' }]}
      onLayout={e => setViewport(e.nativeEvent.layout)}
    >
      <View style={{ position: 'relative', width: imgW, height: imgH }}>
        <Image
          source={{ uri }}
          style={{ width: imgW, height: imgH }}
          resizeMode="contain"
        />
        <DocumentMagnifier uri={uri} containerWidth={imgW} containerHeight={imgH} />
      </View>
    </View>
  );
}
