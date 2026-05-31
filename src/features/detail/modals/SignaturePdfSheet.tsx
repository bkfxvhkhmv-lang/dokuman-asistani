import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Dokument } from '@/store';
import { AppSheet } from '@/design/components';
import { useTheme } from '@/ThemeContext';
import { detailModalStyles as st } from '@/features/detail/detail-modals/styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  dok: Dokument;
  onDone?: () => void;
}

export default function SignaturePdfSheet({ visible, onClose, dok: _dok, onDone: _onDone }: Props) {
  const { Colors: C } = useTheme();

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="PDF unterschreiben"
      subtitle="Diese Funktion wird vorbereitet. Du wirst direkt im Dokument unterschreiben können."
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity
            onPress={onClose}
            style={[st.sheetButton, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>
              Verstanden
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View
        style={{
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: C.border,
          backgroundColor: C.bgCard,
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
          Direkte PDF-Unterschrift folgt als eigener Schritt.
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: C.textSecondary }}>
          Wir erzeugen bewusst noch kein unterschriebenes PDF, solange die Unterschrift nicht direkt an der richtigen Stelle
          im Dokument gezeichnet und gespeichert werden kann.
        </Text>
      </View>
    </AppSheet>
  );
}
