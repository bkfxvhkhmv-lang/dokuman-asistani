import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { AppSheet, AppButton } from '@/design/components';
import type { ModalData } from '@/features/detail/hooks/useModalController';
import { detailModalStyles as st } from '@/features/detail/detail-modals/styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  data: ModalData | undefined;
  onOpenBankingApp: () => void;
}

export default function PaymentPrepareSheet({ visible, onClose, data, onOpenBankingApp }: Props) {
  const { Colors: C } = useTheme();

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={data?.title || 'Zahlung vorbereiten'}
      subtitle="Möchten Sie jetzt in Ihre Banking-App wechseln und die Überweisung vorbereiten?"
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AppButton label="Später" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <AppButton label="Banking-App öffnen" onPress={onOpenBankingApp} style={{ flex: 1 }} />
        </View>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 4 }}
      >
        <View style={[st.infoCard, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={st.infoRow}>
            <Text style={[st.infoLabel, { color: C.textTertiary }]}>Betrag</Text>
            <Text style={[st.infoValue, { color: C.text }]}>{String(data?.amount ?? '')}</Text>
          </View>
          <View style={[st.infoDivider, { backgroundColor: C.border }]} />
          <View style={st.infoRow}>
            <Text style={[st.infoLabel, { color: C.textTertiary }]}>Empfänger</Text>
            <Text style={[st.infoValue, { color: C.text }]}>{String(data?.recipient ?? '')}</Text>
          </View>
          {!!data?.iban && (
            <>
              <View style={[st.infoDivider, { backgroundColor: C.border }]} />
              <View style={st.infoRow}>
                <Text style={[st.infoLabel, { color: C.textTertiary }]}>IBAN</Text>
                <Text style={[st.infoValue, { color: C.text }]}>{String(data.iban ?? '')}</Text>
              </View>
            </>
          )}
          {!!data?.reference && (
            <>
              <View style={[st.infoDivider, { backgroundColor: C.border }]} />
              <View style={st.infoRow}>
                <Text style={[st.infoLabel, { color: C.textTertiary }]}>Verwendung</Text>
                <Text style={[st.infoValue, { color: C.text }]}>{String(data.reference ?? '')}</Text>
              </View>
            </>
          )}
          {!!data?.partnerEmail && (
            <>
              <View style={[st.infoDivider, { backgroundColor: C.border }]} />
              <View style={st.infoRow}>
                <Text style={[st.infoLabel, { color: C.textTertiary }]}>Partner</Text>
                <Text style={[st.infoValue, { color: C.text }]}>{String(data.partnerEmail ?? '')}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </AppSheet>
  );
}
