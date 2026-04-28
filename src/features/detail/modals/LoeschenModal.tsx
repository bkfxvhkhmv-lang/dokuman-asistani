import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../ThemeContext';

interface LoeschenModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LoeschenModal({ visible, onClose, onConfirm }: LoeschenModalProps) {
  const { Colors: C } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 }}>Dokument löschen</Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 18, lineHeight: 18 }}>
          Diese Aktion kann nicht rückgängig gemacht werden.
        </Text>
        <TouchableOpacity onPress={onConfirm}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.danger, marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Löschen</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
