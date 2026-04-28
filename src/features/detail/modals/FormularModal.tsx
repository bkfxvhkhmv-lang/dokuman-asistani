import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../ThemeContext';

interface FormularModalProps {
  visible: boolean;
  onClose: () => void;
  onCopyWiderspruch: () => void;
  onMailWiderspruch: () => void;
  onCopyPayment: () => void;
}

export default function FormularModal({ visible, onClose, onCopyWiderspruch, onMailWiderspruch, onCopyPayment }: FormularModalProps) {
  const { Colors: C } = useTheme();
  const items = [
    { label: 'Widerspruch-Text kopieren', onPress: onCopyWiderspruch },
    { label: 'Widerspruch per E-Mail',    onPress: onMailWiderspruch },
    { label: 'Zahlungsdaten kopieren',    onPress: onCopyPayment },
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>Formular ausfüllen</Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 18 }}>Wählen Sie die gewünschte Aktion.</Text>
        {items.map((item, i) => (
          <TouchableOpacity key={i} onPress={item.onPress}
            style={{ paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
              borderColor: C.border, backgroundColor: C.bg, marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose}
          style={{ marginTop: 4, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
