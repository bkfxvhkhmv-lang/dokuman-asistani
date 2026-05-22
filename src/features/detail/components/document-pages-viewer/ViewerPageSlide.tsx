import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, StyleSheet, type LayoutRectangle } from 'react-native';
import * as Sharing from 'expo-sharing';
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
      <View style={st.pageWrap}>
        <View style={pdfSt.fallbackCard}>
          <Icon name="document-outline" size={48} color="rgba(255,255,255,0.45)" />
          <Text style={pdfSt.fallbackText}>PDF-Vorschau ist noch nicht verfügbar.</Text>
          <TouchableOpacity
            style={pdfSt.openBtn}
            onPress={() => Sharing.shareAsync(uri)}
            activeOpacity={0.75}
          >
            <Text style={pdfSt.openBtnLabel}>Datei öffnen</Text>
          </TouchableOpacity>
        </View>
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

const pdfSt = StyleSheet.create({
  fallbackCard: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  openBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  openBtnLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
