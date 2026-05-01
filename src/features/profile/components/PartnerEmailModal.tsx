/**
 * Partner-E-Mail bottom-sheet modal'i.
 *
 * Mevcut email varsa "Entfernen" butonu da gosterilir.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal, KeyboardAvoidingView, Platform,
  TouchableOpacity, View, Text, TextInput,
} from 'react-native';
import { useTheme } from '@/ThemeContext';

interface Props {
  visible:        boolean;
  partnerEmail:   string;
  onSave:         (email: string) => void;
  onClose:        () => void;
}

export default function PartnerEmailModal({
  visible, partnerEmail, onSave, onClose,
}: Props) {
  const { Colors: C } = useTheme();
  const [draft, setDraft] = useState(partnerEmail);

  // Modal her acildiginda mevcut degeri taslaga koy
  useEffect(() => {
    if (visible) setDraft(partnerEmail);
  }, [visible, partnerEmail]);

  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: C.bgCard,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40,
          }}
        >
          <View
            style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: C.border,
              alignSelf: 'center', marginBottom: 20,
            }}
          />
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>
            Partner-E-Mail
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
            Für Benachrichtigungen an Ihren Partner oder Ehepartner.
          </Text>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="partner@email.de"
            placeholderTextColor={C.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderRadius: 12, borderWidth: 1, borderColor: C.border,
              backgroundColor: C.bgInput, color: C.text,
              fontSize: 15, padding: 14, marginBottom: 16,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {partnerEmail
              ? (
                <TouchableOpacity
                  onPress={() => { onSave(''); onClose(); }}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: 14,
                    borderWidth: 1, borderColor: C.dangerBorder,
                    alignItems: 'center', backgroundColor: C.dangerLight,
                  }}
                >
                  <Text style={{ color: C.danger, fontWeight: '600' }}>Entfernen</Text>
                </TouchableOpacity>
              )
              : null}
            <TouchableOpacity
              onPress={() => { onSave(draft.trim()); onClose(); }}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 14,
                alignItems: 'center', backgroundColor: C.primary,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Speichern</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
