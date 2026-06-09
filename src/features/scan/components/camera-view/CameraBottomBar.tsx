import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';

interface Props {
  bottomInset: number;
  stability: { isStable: boolean };
  isCapturing: boolean;
  pageCount: number;
  onCapture: () => void;
  onBatchPress: () => void;
  onOpenGallery?: () => void;
}

export default function CameraBottomBar({
  bottomInset, isCapturing, pageCount, onCapture, onBatchPress, onOpenGallery,
}: Props) {
  return (
    <View style={[st.bar, { bottom: bottomInset + 24 }]}>
      {/* Sol — galeri */}
      <View style={st.side}>
        {onOpenGallery && (
          <TouchableOpacity onPress={onOpenGallery} hitSlop={HIT_SLOP_LG} style={st.galleryBtn}>
            <Icon name="image-outline" size={24} color="#fff" />
            <Text style={st.galleryText}>Galerie</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ortada shutter */}
      <TouchableOpacity
        style={st.shutter}
        onPress={onCapture}
        activeOpacity={0.8}
        disabled={isCapturing}
      >
        <View style={[st.shutterInner, isCapturing && { opacity: 0.6 }]} />
      </TouchableOpacity>

      {/* Sağda — Sichern pill veya boş */}
      <View style={st.side}>
        {pageCount > 0 && (
          <TouchableOpacity onPress={onBatchPress} hitSlop={HIT_SLOP_LG} style={st.sichernPill}>
            <Icon name="checkmark" size={14} color="#fff" />
            <Text style={st.sichernText}>Sichern ({pageCount})</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar:         { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  side:        { flex: 1, alignItems: 'flex-end' },
  shutter:     { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner:{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  sichernPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  sichernText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  galleryBtn:  { alignItems: 'center', gap: 4 },
  galleryText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
});
