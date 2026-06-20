import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import Icon from '@/components/Icon';
import { AppInput } from '@/design/components';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import type { StoreState } from '@/store';
import { CANONICAL_DOCUMENT_TYPES } from '@/product/canonicalDocTypes';
import { computeEditDirty, EMPTY_EDIT_SNAPSHOT, type EditSnapshot } from './editDirtyCheck';
import { GERMAN_DATE_PLACEHOLDER } from '@/utils/germanInputFormat';
const RISIKEN = [
  { id: 'hoch',    label: 'Dringend' },
  { id: 'mittel',  label: 'Diese Woche' },
  { id: 'niedrig', label: 'Kein Handlungsbedarf' },
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
  const { t } = useT();

  // useState (not useRef) so that setting the snapshot triggers a re-render,
  // which recomputes isDirty correctly before the user can interact.
  // With useRef the snapshot update happened after render but isDirty was already
  // computed against empty initial values → false positive on immediate close.
  const [initialValues, setInitialValues] = useState<EditSnapshot>(EMPTY_EDIT_SNAPSHOT);

  useEffect(() => {
    if (visible) {
      setInitialValues({
        titel: modal.editTitel,
        absender: modal.editAbsender,
        betrag: modal.editBetrag,
        frist: modal.editFrist,
        dokumentDatum: modal.editDokumentDatum,
        iban: modal.editIban,
        zahlungszweck: modal.editZahlungszweck,
        aktenzeichen: modal.editAktenzeichen,
        kundennr: modal.editKundennr,
        typ: modal.editTyp,
        risiko: modal.editRisiko,
        profilId: modal.editProfilId,
        userOrdner: modal.editUserOrdner,
      });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentValues: EditSnapshot = {
    titel: modal.editTitel,
    absender: modal.editAbsender,
    betrag: modal.editBetrag,
    frist: modal.editFrist,
    dokumentDatum: modal.editDokumentDatum,
    iban: modal.editIban,
    zahlungszweck: modal.editZahlungszweck,
    aktenzeichen: modal.editAktenzeichen,
    kundennr: modal.editKundennr,
    typ: modal.editTyp,
    risiko: modal.editRisiko,
    profilId: modal.editProfilId,
    userOrdner: modal.editUserOrdner,
  };

  const isDirty = computeEditDirty(currentValues, initialValues);

  const handleBackdropPress = useCallback(() => {
    if (!isDirty) { onClose(); return; }
    Alert.alert(
      'Änderungen verwerfen?',
      'Nicht gespeicherte Änderungen gehen verloren.',
      [
        { text: 'Weiter bearbeiten', style: 'cancel' },
        { text: 'Verwerfen', style: 'destructive', onPress: onClose },
      ],
    );
  }, [isDirty, onClose]);

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={handleBackdropPress} activeOpacity={1} />
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
              {/* Dokument */}
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>DOKUMENT</Text>
              <AppInput label="Titel" icon="file-text" placeholder="Dokumenttitel"
                value={modal.editTitel} onChangeText={modal.setEditTitel} style={{ marginBottom: 10 }} />
              <AppInput label="Belegdatum" icon="calendar-blank" placeholder={GERMAN_DATE_PLACEHOLDER}
                value={modal.editDokumentDatum} onChangeText={modal.setEditDokumentDatum}
                keyboardType="number-pad" style={{ marginBottom: 10 }} />
              <AppInput label="Frist" icon="clock" placeholder={GERMAN_DATE_PLACEHOLDER}
                value={modal.editFrist} onChangeText={modal.setEditFrist}
                keyboardType="number-pad" style={{ marginBottom: 18 }} />

              {/* Beteiligte */}
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>BETEILIGTE</Text>
              <AppInput label="Absender" icon="buildings" placeholder="Behörde / Unternehmen"
                value={modal.editAbsender} onChangeText={modal.setEditAbsender} style={{ marginBottom: 18 }} />

              {/* Zahlung */}
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>ZAHLUNG</Text>
              <AppInput label="Betrag (€)" icon="currency-eur" placeholder="0,00"
                value={modal.editBetrag} onChangeText={modal.setEditBetrag} keyboardType="decimal-pad" style={{ marginBottom: 10 }} />
              <AppInput label="IBAN" icon="bank" placeholder="DE00 0000 0000 0000 0000 00"
                value={modal.editIban} onChangeText={modal.setEditIban}
                autoCapitalize="characters" style={{ marginBottom: 10 }} />
              <AppInput label="Verwendungszweck" icon="chat-circle" placeholder="Referenz / Betreff"
                value={modal.editZahlungszweck} onChangeText={modal.setEditZahlungszweck} style={{ marginBottom: 18 }} />

              {/* Referenz */}
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>REFERENZ</Text>
              <AppInput label="Aktenzeichen" icon="clipboard-text" placeholder="Az. oder Ref.-Nr."
                value={modal.editAktenzeichen} onChangeText={modal.setEditAktenzeichen} style={{ marginBottom: 10 }} />
              <AppInput label="Kundennummer" icon="identification-badge" placeholder="Kunden-Nr."
                value={modal.editKundennr} onChangeText={modal.setEditKundennr} style={{ marginBottom: 14 }} />

              {(state.einstellungen?.profile || []).length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>PROFIL ZUWEISEN</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <TouchableOpacity onPress={() => modal.setEditProfilId(null)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                        borderColor: !modal.editProfilId ? C.primary : C.border,
                        backgroundColor: !modal.editProfilId ? C.primaryLight : 'transparent' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="people-outline" size={12} color={!modal.editProfilId ? C.primaryDark : C.textSecondary} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: !modal.editProfilId ? C.primaryDark : C.textSecondary }}>Alle</Text>
                      </View>
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
              <AppInput
                label="Dein Ordner"
                icon="folder"
                placeholder='z. B. Firma 2026 / Auto'
                value={modal.editUserOrdner}
                onChangeText={modal.setEditUserOrdner}
                style={{ marginBottom: 18 }}
              />
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 10 }}>AUTOMATISCHE KATEGORIE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {CANONICAL_DOCUMENT_TYPES.map(t => (
                  <TouchableOpacity key={t} onPress={() => modal.setEditTyp(t)}
                    style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
                      borderColor: modal.editTyp === t ? C.primary : C.border,
                      backgroundColor: modal.editTyp === t ? C.primaryLight : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: modal.editTyp === t ? '700' : '400',
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
                    {modal.editRisiko === r.id && <Icon name="check" size={16} color={C.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <TouchableOpacity onPress={onSave}
          style={{ borderRadius: R.lg, padding: S.md, alignItems: 'center', backgroundColor: C.primary }}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Speichern</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
