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
  const { flash, toggleFlash, autoCapture, toggleAutoCapture } = useScan();
  const { t: T } = useT();

  const handleClose = () => {
    if (pageCount > 0) {
      Alert.alert(
        T('scan.camera.abort_title'),
        T(pageCount === 1 ? 'scan.camera.abort_body_single' : 'scan.camera.abort_body_multi', { n: pageCount }),
        [
          { text: T('scan.camera.continue'), style: 'cancel' },
          { text: T('common.cancel'), style: 'destructive', onPress: onClose },
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

      <TouchableOpacity onPress={toggleAutoCapture} hitSlop={HIT_SLOP_LG} style={[st.autoBtn, autoCapture && st.autoBtnActive]}>
        <Text style={[st.autoBtnLabel, autoCapture && st.autoBtnLabelActive]}>{T('scan.camera.auto')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  bar:        { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  textBtn:    { paddingVertical: 6, paddingHorizontal: 2 },
  textBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '500' },
  iconBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  autoBtn:    { minWidth: 58, height: 32, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  autoBtnActive: { backgroundColor: 'rgba(34,197,94,0.22)', borderColor: 'rgba(34,197,94,0.55)' },
  autoBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  autoBtnLabelActive: { color: '#D7FFE6' },
});
