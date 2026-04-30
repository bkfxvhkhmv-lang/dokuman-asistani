/**
 * Manual Adjust ana onizleme alani.
 *
 * Icerigi:
 *  - Pinch/pan animasyonu uygulayan goruntu kutusu
 *  - "ORIGINAL" rozet (bas-tut karsilastirmada gorunur)
 *  - Bas-tut karsilastirma butonu (sol-alt)
 *  - +/-/reset zoom dugmeleri (sag-alt)
 *  - Onizleme yukleniyor spinner'i
 *  - Sol-ust X kapatma butonu
 */
import React from 'react';
import { View, Text, Image, Animated, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { ACCENT } from '@/features/scan/constants';
import { HIT_SLOP_LG } from '@/theme';
import { adjustStyles as st } from '@/features/scan/components/manual-adjust/styles';
import type { T } from '@/features/scan/components/manual-adjust/types';
import type { usePinchZoom } from '@/features/scan/hooks/usePinchZoom';

type ZoomState = ReturnType<typeof usePinchZoom>;

interface Props {
  imageUri: string | null;
  previewUri: string | null;
  showOriginal: boolean;
  setShowOriginal: (v: boolean) => void;
  previewing: boolean;
  zoom: ZoomState;
  onCancel: () => void;
  t: T;
}

export default function PreviewArea({
  imageUri, previewUri, showOriginal, setShowOriginal,
  previewing, zoom, onCancel, t,
}: Props) {
  const insets = useSafeAreaInsets();

  const adjustedUri   = previewUri ?? imageUri ?? undefined;
  const baseUri       = imageUri ?? undefined;
  const displayUri    = showOriginal ? baseUri : adjustedUri;
  const hasComparison = !!previewUri && previewUri !== imageUri;

  return (
    <View style={st.previewArea} {...zoom.panHandlers}>
      <Animated.View
        style={[
          st.previewBox,
          {
            transform: [
              { scale:      zoom.scale },
              { translateX: zoom.translateX },
              { translateY: zoom.translateY },
            ],
          },
        ]}
        pointerEvents="none"
      >
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={st.previewImage} resizeMode="contain" />
        ) : (
          <View style={st.previewPlaceholder} />
        )}
      </Animated.View>

      {/* "Original" rozeti — bas-tut sirasinda gozukur */}
      {showOriginal && hasComparison && (
        <View
          style={[st.compareBadge, { top: Math.max(14, insets.top + 6) }]}
          pointerEvents="none"
        >
          <Text style={st.compareBadgeText}>{t('scan.original').toUpperCase()}</Text>
        </View>
      )}

      {/* Bas-tut karsilastirma butonu (sol-alt) */}
      {hasComparison && (
        <Pressable
          onPressIn={() => setShowOriginal(true)}
          onPressOut={() => setShowOriginal(false)}
          style={st.compareBtn}
          hitSlop={HIT_SLOP_LG}
        >
          <Icon name="image-outline" size={14} color={showOriginal ? '#fff' : 'rgba(255,255,255,0.85)'} />
          <Text style={st.compareBtnText}>{t('scan.original')}</Text>
        </Pressable>
      )}

      {/* Zoom kontrolleri (sag-alt) */}
      <View style={st.zoomBtnGroup} pointerEvents="box-none">
        <TouchableOpacity onPress={zoom.zoomIn} style={st.zoomBtn} hitSlop={HIT_SLOP_LG}>
          <Icon name="plus" size={18} color="#fff" weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity onPress={zoom.zoomOut} style={st.zoomBtn} hitSlop={HIT_SLOP_LG}>
          <Icon name="minus" size={18} color="#fff" weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity onPress={zoom.reset} style={st.zoomBtn} hitSlop={HIT_SLOP_LG}>
          <Icon name="arrow-clockwise" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {previewing && (
        <View style={st.previewBusy} pointerEvents="none">
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      )}

      {/* Tek floating X kapatma butonu (sol-ust). Reset, kontrol bloku
          icindeki "Original" preset chip'inden ulasilabilir. */}
      <TouchableOpacity
        onPress={onCancel}
        style={[st.floatingCloseBtn, { top: Math.max(12, insets.top + 4) }]}
        hitSlop={HIT_SLOP_LG}
      >
        <Icon name="x" size={18} color="#fff" weight="bold" />
      </TouchableOpacity>
    </View>
  );
}
