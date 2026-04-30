import React from 'react';
import { Animated, View } from 'react-native';
import Icon from '@/components/Icon';
import type { PinchZoomState } from '@/features/scan/hooks/usePinchZoom';
import { editViewStyles as st } from '@/features/scan/components/edit-view/styles';

interface Props {
  zoom: Pick<PinchZoomState, 'scale' | 'translateX' | 'translateY' | 'panHandlers'>;
  previewUri?: string | null;
  imageOpacity: Animated.Value;
  rotateDeg: Animated.AnimatedInterpolation<string>;
  editModeShowsRotateOverlay: boolean;
}

export default function EditPreviewPanel({
  zoom,
  previewUri,
  imageOpacity,
  rotateDeg,
  editModeShowsRotateOverlay,
}: Props) {
  const { scale, translateX, translateY, panHandlers } = zoom;

  return (
    <Animated.View
      style={[st.preview,
        { transform: [{ scale }, { translateX }, { translateY }] }]}
      {...panHandlers}
    >
      <Animated.Image
        source={{ uri: previewUri ?? undefined }}
        style={[st.previewImage, { opacity: imageOpacity }]}
        resizeMode="contain"
      />
      {editModeShowsRotateOverlay && (
        <Animated.View style={[st.rotateOverlay, { transform: [{ rotate: rotateDeg }] }]}>
          <View style={st.rotateIcon}>
            <Icon name="arrow-clockwise" size={28} color="#FBBF24" />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}
