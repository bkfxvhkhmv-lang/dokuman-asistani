import React, { useState } from 'react';
import { View, Text, Image, Dimensions, type LayoutRectangle } from 'react-native';
import Pdf from 'react-native-pdf';
import Icon from '@/components/Icon';
import DocumentMagnifier from '@/components/DocumentMagnifier';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

interface Props {
  uri: string;
  isMissing: boolean;
}

const WINDOW = Dimensions.get('window');

/** Tam ekran önizleme — mercek (uzun bas + sürükle) küçük bölümü büyütür */
export default function ViewerPageSlide({ uri, isMissing }: Props) {
  const [viewport, setViewport] = useState<LayoutRectangle | null>(null);

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
      <View style={[st.pageWrap, { backgroundColor: '#1a1a1a' }]}>
        <Pdf
          source={{ uri, cache: true }}
          style={{ flex: 1, width: imgW }}
          enablePaging={false}
          horizontal={false}
          onError={() => null}
        />
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

