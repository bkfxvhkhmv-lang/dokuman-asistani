import React from 'react';
import { Modal, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { AppInput } from '@/design/components';
import type { ModalController } from '@/features/detail/hooks/useModalController';

interface AufgabenModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  modal: ModalController;
}

function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function AufgabenModal({ visible, onClose, onAdd, modal }: AufgabenModalProps) {
  const { Colors: C, S, R } = useTheme();
  const { t } = useT();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDatePlaceholder = formatLocalDate(tomorrow);
  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 16 }}>Neue Aufgabe</Text>
          <AppInput label="Aufgabe" icon="check" placeholder="z.B. Zahlung überweisen"
            value={modal.neueAufgabeTitel} onChangeText={modal.setNeueAufgabeTitel} style={{ marginBottom: 14 }} returnKeyType="next" />
          <AppInput label={t('detail.aufgaben.due_date_label')} icon="calendar" placeholder={dueDatePlaceholder}
            value={modal.neueAufgabeFrist} onChangeText={modal.setNeueAufgabeFrist} style={{ marginBottom: 14 }} returnKeyType="next" />
          <AppInput label="Verantwortlich" icon="user" placeholder="z.B. Steuerberater"
            value={modal.neueAufgabeVerantwortlich} onChangeText={modal.setNeueAufgabeVerantwortlich} style={{ marginBottom: 14 }} returnKeyType="done" />
          <TouchableOpacity onPress={onAdd}
            style={{ borderRadius: R.lg, padding: S.md, alignItems: 'center',
              backgroundColor: modal.neueAufgabeTitel.trim() ? C.primary : C.border }}
            accessibilityRole="button"
            accessibilityLabel="Aufgabe hinzufügen"
            accessibilityState={{ disabled: !modal.neueAufgabeTitel.trim() }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Hinzufügen</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
