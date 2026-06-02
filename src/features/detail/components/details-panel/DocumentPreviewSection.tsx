import { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import Pdf from 'react-native-pdf';
import { useTheme } from '@/ThemeContext';
import DocumentEntityOverlay from '@/components/DocumentEntityOverlay';
import DocumentSpotlight from '@/components/DocumentSpotlight';
import type { Dokument } from '@/store';
import type { EntityBox } from '@/services/visionApi';

interface Props {
  dok: Dokument;
  onOpenFullscreen?: () => void;
}

export function DocumentPreviewSection({ dok, onOpenFullscreen }: Props) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [spotlightBox, setSpotlightBox] = useState<EntityBox | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);

  if (!dok.uri) return null;

  const isPdfDoc = dok.uri.toLowerCase().endsWith('.pdf');

  const inner = (
    <View
      onLayout={e => {
        const w = e.nativeEvent.layout.width;
        setImgSize(prev => (prev.w === w ? prev : { w, h: w * 1.414 }));
      }}
    >
      {isPdfDoc ? (
        <Pdf
          source={{ uri: dok.uri, cache: true }}
          style={{ width: imgSize.w || 300, height: imgSize.h || 300 }}
          singlePage
          onLoadComplete={(n) => setPdfPageCount(n)}
        />
      ) : (
        <>
          <Image
            source={{ uri: dok.uri }}
            style={{ width: imgSize.w || '100%', height: imgSize.h || 300 }}
            resizeMode="contain"
          />
          {dok.entityBoxes && dok.entityBoxes.length > 0 && imgSize.w > 0 && (
            <DocumentEntityOverlay
              entityBoxes={dok.entityBoxes}
              imageWidth={imgSize.w}
              imageHeight={imgSize.h}
              viewWidth={imgSize.w}
              viewHeight={imgSize.h}
              onBoxPress={box => setSpotlightBox(box)}
            />
          )}
          <DocumentSpotlight
            entity={spotlightBox}
            scaleX={1}
            scaleY={1}
            onDismiss={() => setSpotlightBox(null)}
          />
        </>
      )}
    </View>
  );

  return (
    <View
      style={{
        marginBottom: S.md,
        borderRadius: R.lg,
        overflow: 'hidden',
        backgroundColor: C.bgCard,
        borderWidth: 0.5,
        borderColor: C.border,
        ...Shadow.sm,
      }}
    >

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: S.md,
          paddingTop: S.md,
          paddingBottom: S.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: C.textTertiary,
              letterSpacing: 0.8,
            }}
          >
            DOKUMENT VORSCHAU
          </Text>
          {isPdfDoc && (
            <View style={{ backgroundColor: C.primary + '18', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: C.primary, letterSpacing: 0.4 }}>
                {pdfPageCount > 1
                  ? `PDF · ${pdfPageCount} Seiten`
                  : pdfPageCount === 1
                    ? 'PDF · 1 Seite'
                    : 'PDF'}
              </Text>
            </View>
          )}
        </View>
        {onOpenFullscreen ? (
          <TouchableOpacity
            onPress={onOpenFullscreen}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Vollbild"
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>Vollbild</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {onOpenFullscreen ? (
        <TouchableOpacity activeOpacity={0.95} onPress={onOpenFullscreen} accessibilityRole="imagebutton">
          {inner}
          <View style={{ paddingBottom: S.sm, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary }}>
              Antippen · Vollbild
            </Text>
            <Text style={{ fontSize: 9, color: C.textTertiary, opacity: 0.6 }}>
              Falsch gedreht? Im Vollbild drehen.
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        inner
      )}
    </View>
  );
}
