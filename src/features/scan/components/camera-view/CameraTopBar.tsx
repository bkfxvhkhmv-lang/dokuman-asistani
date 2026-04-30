import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import { styles } from '@/features/scan/styles';
import { useScan } from '@/features/scan/context/ScanContext';

interface TopBarProps {
  topInset: number;
  onClose: () => void;
}

export default function CameraTopBar({ topInset, onClose }: TopBarProps) {
  const { flash, toggleFlash } = useScan();

  return (
    <View style={[styles.topBar, { top: topInset }]}>
      <TouchableOpacity style={styles.controlBtn} onPress={onClose} hitSlop={HIT_SLOP_LG}>
        <Icon name="close" size={21} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlBtn, flash === 'on' && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
        onPress={toggleFlash}
        hitSlop={HIT_SLOP_LG}
      >
        <Icon name={flash === 'on' ? 'flash' : 'flash-off'} size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
