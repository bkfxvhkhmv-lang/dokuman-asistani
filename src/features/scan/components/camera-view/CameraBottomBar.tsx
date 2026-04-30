import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import { styles } from '@/features/scan/styles';
import { SUCCESS, WARNING } from '@/features/scan/constants';
import { useScanI18n } from '@/hooks/useScanI18n';
import type { StabilityState } from '@/features/scan/components/camera-view/types';

interface Props {
  bottomInset: number;
  stability: StabilityState;
  isCapturing: boolean;
  pageCount: number;
  onCapture: () => void;
  onBatchPress: () => void;
}

export default function CameraBottomBar({
  bottomInset,
  stability,
  isCapturing,
  pageCount,
  onCapture,
  onBatchPress,
}: Props) {
  const { t } = useScanI18n();

  return (
    <View style={[styles.bottomBar, { bottom: bottomInset + 20 }]}>
      <View style={{ width: 60 }} />

      <TouchableOpacity
        style={[
          styles.shutterBtn,
          {
            borderColor: stability.isStable ? SUCCESS : 'rgba(255,255,255,0.5)',
            shadowColor: stability.isStable ? SUCCESS : 'transparent',
            shadowOpacity: stability.isStable ? 0.8 : 0,
            shadowRadius: stability.isStable ? 20 : 0,
          },
        ]}
        onPress={onCapture}
        activeOpacity={0.8}
        disabled={isCapturing}
      >
        <View
          style={[
            styles.shutterInner,
            { backgroundColor: isCapturing ? WARNING : stability.isStable ? SUCCESS : '#fff' },
          ]}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.sideBtn} onPress={onBatchPress} hitSlop={HIT_SLOP_LG}>
        <View style={styles.sideBtnCircle}>
          {pageCount > 0
            ? <Text style={styles.pageCountText}>{pageCount}</Text>
            : <Icon name="albums-outline" size={20} color="#fff" />
          }
        </View>
        <Text style={styles.sideBtnText}>{pageCount > 0 ? t('scan.pages') : t('scan.stack')}</Text>
      </TouchableOpacity>
    </View>
  );
}
