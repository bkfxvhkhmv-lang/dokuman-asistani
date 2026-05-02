import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import { useScan } from '@/features/scan/context/ScanContext';
import { useT } from '@/hooks/useT';

interface TopBarProps {
  topInset: number;
  pageCount: number;
  onClose: () => void;
}

export default function CameraTopBar({ topInset, pageCount, onClose }: TopBarProps) {
  const { flash, toggleFlash } = useScan();
  const { t: T } = useT();

  const handleClose = () => {
    if (pageCount > 0) {
      Alert.alert(
        'Scan abbrechen?',
        `${pageCount} ${pageCount === 1 ? 'Seite' : 'Seiten'} werden verworfen.`,
        [
          { text: 'Weiterscannen', style: 'cancel' },
          { text: 'Abbrechen', style: 'destructive', onPress: onClose },
        ],
      );
    } else {
      onClose();
    }
  };

  return (
    <View style={[st.bar, { top: topInset }]}>
      <TouchableOpacity onPress={handleClose} hitSlop={HIT_SLOP_LG} style={st.textBtn}>
        <Text style={st.textBtnLabel}>{T('common.cancel')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={toggleFlash} hitSlop={HIT_SLOP_LG} style={st.iconBtn}>
        <Icon
          name={flash === 'on' ? 'flash' : 'flash-off'}
          size={20}
          color={flash === 'on' ? '#FFD60A' : '#fff'}
        />
      </TouchableOpacity>

      <TouchableOpacity hitSlop={HIT_SLOP_LG} style={st.textBtn}>
        <Text style={st.textBtnLabel} />
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  bar:        { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  textBtn:    { paddingVertical: 6, paddingHorizontal: 2 },
  textBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '500' },
  iconBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
