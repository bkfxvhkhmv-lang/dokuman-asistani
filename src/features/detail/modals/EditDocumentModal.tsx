import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import { AppInput } from '../../../design/components';
import type { ModalController } from '../hooks/useModalController';
import type { StoreState } from '../../../store';

const TYPEN = ['Rechnung','Mahnung','Bußgeld','Behörde','Termin','Versicherung','Vertrag','Sonstiges'];
const RISIKEN = [
  { id: 'hoch',    label: '🔴 Dringend' },
  { id: 'mittel',  label: '🟡 Diese Woche' },
  { id: 'niedrig', label: '🟢 Kein Handlungsbedarf' },
];

interface EditDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  state: StoreState;
  modal: ModalController;
}

export default function EditDocumentModal({ visible, onClose, onSave, state, modal }: EditDocumentModalProps) {
  const { Colors: C, S, R } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} activeOpacity={1} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 16 }}>Dokument bearbeiten</Text>

        {/* Tab switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, padding: 3, marginBottom: 18 }}>
          {([['info', 'Angaben'], ['klassif', 'Klassifizierung']] as [string, string][]).map(([id, label]) => (
            <TouchableOpacity key={id} onPress={() => modal.setEditTab(id)}
              style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
                backgroundColor: modal.editTab === id ? C.bgCard : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: modal.editTab === id ? '700' : '500',
                color: modal.editTab === id ? C.text : C.textTertiary }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 16 }}>
          {modal.editTab === 'info' ? (
            <>
              <AppInput label="Titel" icon="file-text" placeholder="Dokumenttitel"
                value={modal.editTitel} onChangeText={modal.setEditTitel} style={{ marginBottom: 14 }} />
              <AppInput label="Absender" icon="buildings" placeholder="Behörde / Unternehmen"
                value={modal.editAbsender} onChangeText={modal.setEditAbsender} style={{ marginBottom: 14 }} />
              <AppInput label="Betrag (€)" icon="receipt" placeholder="0.00"
                value={modal.editBetrag} onChangeText={modal.setEditBetrag} keyboardType="decimal-pad" style={{ marginBottom: 14 }} />
              <AppInput label="Frist (JJJJ-MM-TT)" icon="calendar" placeholder="z.B. 2026-05-01"
                value={modal.editFrist} onChangeText={modal.setEditFrist} style={{ marginBottom: 14 }} />

              {(state.einstellungen?.profile || []).length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>PROFIL ZUWEISEN</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <TouchableOpacity onPress={() => modal.setEditProfilId(null)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                        borderColor: !modal.editProfilId ? C.primary : C.border,
                        backgroundColor: !modal.editProfilId ? C.primaryLight : 'transparent' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: !modal.editProfilId ? C.primaryDark : C.textSecondary }}>👥 Alle</Text>
                    </TouchableOpacity>
                    {(state.einstellungen?.profile || []).map((p: any) => (
                      <TouchableOpacity key={p.id} onPress={() => modal.setEditProfilId(p.id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                          borderColor: modal.editProfilId === p.id ? p.farbe : C.border,
                          backgroundColor: modal.editProfilId === p.id ? p.farbe + '22' : 'transparent' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600',
                          color: modal.editProfilId === p.id ? p.farbe : C.textSecondary }}>{p.emoji} {p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 10 }}>DOKUMENTTYP</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {TYPEN.map(t => (
                  <TouchableOpacity key={t} onPress={() => modal.setEditTyp(t)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
                      borderColor: modal.editTyp === t ? C.primary : C.border,
                      backgroundColor: modal.editTyp === t ? C.primaryLight : 'transparent' }}>
                    <Text style={{ fontSize: 13, fontWeight: modal.editTyp === t ? '700' : '400',
                      color: modal.editTyp === t ? C.primaryDark : C.textSecondary }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 10 }}>DRINGLICHKEIT</Text>
              <View style={{ gap: 8 }}>
                {RISIKEN.map(r => (
                  <TouchableOpacity key={r.id} onPress={() => modal.setEditRisiko(r.id)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14,
                      borderRadius: 12, borderWidth: 1,
                      borderColor: modal.editRisiko === r.id ? C.primary : C.border,
                      backgroundColor: modal.editRisiko === r.id ? C.primaryLight : C.bgCard }}>
                    <Text style={{ fontSize: 14, fontWeight: modal.editRisiko === r.id ? '700' : '400',
                      color: modal.editRisiko === r.id ? C.primaryDark : C.text }}>{r.label}</Text>
                    {modal.editRisiko === r.id && <Text style={{ color: C.primary }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <TouchableOpacity onPress={onSave}
          style={{ borderRadius: R.lg, padding: S.md, alignItems: 'center', backgroundColor: C.primary }}
          accessibilityRole="button"
          accessibilityLabel="Speichern">
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Speichern</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
