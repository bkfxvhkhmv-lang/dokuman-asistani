import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../ThemeContext';

interface ZahlungModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  betrag?: string | null;
  empfaenger?: string | null;
}

export default function ZahlungModal({ visible, onClose, onConfirm, betrag, empfaenger }: ZahlungModalProps) {
  const { Colors: C } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 }}>Zahlung durchführen</Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>Betrag: {betrag || '—'}</Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 18 }}>Empfänger: {empfaenger || '—'}</Text>
        <TouchableOpacity onPress={onConfirm}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.primary, marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Als erledigt markieren</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
