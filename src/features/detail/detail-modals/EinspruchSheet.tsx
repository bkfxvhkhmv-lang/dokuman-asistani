import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { AppSheet } from '@/design/components';
import { detailModalStyles as st } from '@/features/detail/detail-modals/styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  einspruchText: string;
  onCopy: () => void;
  onShare: () => void;
}

export default function EinspruchSheet({ visible, onClose, einspruchText, onCopy, onShare }: Props) {
  const { Colors: C } = useTheme();

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="Einspruch-Vorlage"
      subtitle="Prüfen Sie den Entwurf, kopieren Sie ihn oder teilen Sie ihn weiter."
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={onCopy}
            style={[st.sheetButton, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>Kopieren</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onShare}
            style={[st.sheetButton, { backgroundColor: C.bg, borderColor: C.border }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Teilen</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ borderRadius: 16, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg, padding: 14, maxHeight: 320 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 13, lineHeight: 21, color: C.text }}>
            {einspruchText || 'Es ist noch kein Text verfügbar.'}
          </Text>
        </ScrollView>
      </View>
    </AppSheet>
  );
}
