import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import type { Dokument } from '../../../store';

interface SicherTeilenModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTTL: (ttl: string) => void;
  dok?: Dokument | null;
}

const TTL_OPTIONS: [string, string][] = [
  ['24 Stunden', '24h'],
  ['7 Tage',     '7d'],
  ['30 Tage',    '30d'],
];

export default function SicherTeilenModal({ visible, onClose, onSelectTTL, dok }: SicherTeilenModalProps) {
  const { Colors: C } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>Sicher teilen</Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 18 }}>Wählen Sie die Gültigkeitsdauer für den sicheren Link.</Text>
        {!!dok?.v4DocId ? (
          <>
            {TTL_OPTIONS.map(([label, ttl], i) => (
              <TouchableOpacity key={i} onPress={() => onSelectTTL(ttl)}
                style={{ paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
                  borderColor: C.border, backgroundColor: C.bg, marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={{ padding: 14, borderRadius: 12, backgroundColor: C.warningLight, borderWidth: 1, borderColor: C.warning, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.warningText, marginBottom: 4 }}>Nicht verfügbar</Text>
            <Text style={{ fontSize: 12, color: C.warningText }}>Dieses Dokument wurde noch nicht mit V4 synchronisiert.</Text>
          </View>
        )}
        <TouchableOpacity onPress={onClose}
          style={{ marginTop: 4, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
