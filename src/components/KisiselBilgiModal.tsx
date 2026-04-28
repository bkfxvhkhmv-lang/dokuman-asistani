import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../ThemeContext';
import { BILGI_ALANLARI, getBilgiler, saveBilgiler, type Bilgiler } from '../services/kisiselBilgi';

interface KisiselBilgiModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function KisiselBilgiModal({ visible, onClose }: KisiselBilgiModalProps) {
  const { Colors: C, R, S } = useTheme();
  const [bilgiler, setBilgiler] = useState<Bilgiler>({});
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (visible) getBilgiler().then(setBilgiler);
  }, [visible]);

  const handleKaydet = async () => {
    setKaydediliyor(true);
    await saveBilgiler(bilgiler);
    setKaydediliyor(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} activeOpacity={1} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 32 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>📁  Persönliche Daten</Text>
          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
            Einmal eingeben — automatisch in alle Vorlagen eingefügt
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {BILGI_ALANLARI.map(alan => (
            <View key={alan.id} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 5, letterSpacing: 0.5 }}>
                {alan.icon}  {alan.label.toUpperCase()}
              </Text>
              <TextInput
                style={{
                  backgroundColor: C.bgInput, borderRadius: R.lg,
                  borderWidth: 1, borderColor: bilgiler[alan.id] ? C.primary + '66' : C.border,
                  color: C.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 11,
                }}
                placeholder={alan.placeholder}
                placeholderTextColor={C.textTertiary}
                value={bilgiler[alan.id] || ''}
                onChangeText={v => setBilgiler(prev => ({ ...prev, [alan.id]: v }))}
                autoCapitalize={alan.id === 'email' ? 'none' : 'words'}
                keyboardType={
                  alan.id === 'email' ? 'email-address' :
                  alan.id === 'telefon' ? 'phone-pad' :
                  alan.id === 'plz' ? 'number-pad' : 'default'
                }
              />
            </View>
          ))}
          <View style={{ backgroundColor: C.primaryLight, borderRadius: R.lg, padding: 14, marginTop: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: C.primaryDark, lineHeight: 18 }}>
               Alle Daten werden ausschließlich lokal auf Ihrem Gerät gespeichert. Nichts wird übertragen.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleKaydet}
            disabled={kaydediliyor}
            style={{ borderRadius: R.lg, padding: 16, alignItems: 'center', backgroundColor: C.primary, marginTop: 8, opacity: kaydediliyor ? 0.7 : 1 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {kaydediliyor ? 'Wird gespeichert…' : '✓  Speichern'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
