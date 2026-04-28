import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../ThemeContext';
import { AppSheet, AppButton } from '../../design/components';
import PremiumToast from '../../design/components/PremiumToast';
import { useToast } from '../../hooks/useToast';
import type { Dokument, StoreAction, StoreState } from '../../store';
import type { ActionSession } from './hooks/useActionSessionManager';
import type { ModalController } from './hooks/useModalController';
import type { useDocumentActions } from './hooks/useDocumentActions';

import ActionSimulatorModal from '../../components/ActionSimulatorModal';
import EditDocumentModal from './modals/EditDocumentModal';
import AufgabenModal from './modals/AufgabenModal';
import FormularModal from './modals/FormularModal';
import ErledigtModal from './modals/ErledigtModal';
import SicherTeilenModal from './modals/SicherTeilenModal';
import YanıtSablonlariModal from '../../components/YanıtSablonlariModal';
import KurumlarRehberiModal from '../../components/KurumlarRehberiModal';
import BelgeAciklamaModal from '../../components/BelgeAciklamaModal';
import HilfeModal from '../../components/HilfeModal';
import BelgeChatModal from '../../components/BelgeChatModal';

export interface MoreMenuItem {
  key: string;
  icon: string;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

interface Props {
  modal: ModalController;
  dok: Dokument;
  dokId: string;
  state: StoreState;
  dispatch: (action: StoreAction) => void;
  actions: ReturnType<typeof useDocumentActions>;
  moreMenu: boolean;
  setMoreMenu: (v: boolean) => void;
  moreItems: MoreMenuItem[];
  beginActionSession: (data: ActionSession) => void;
  router: { back: () => void };
}

export default function DetailModalsContainer({
  modal, dok, dokId, state, dispatch, actions,
  moreMenu, setMoreMenu, moreItems, beginActionSession, router,
}: Props) {
  const { Colors: C } = useTheme();
  const { config: toastConfig, show: showToast, hide: hideToast } = useToast();
  const pendingMarkRef = useRef(false);

  const handleCopyEinspruch = useCallback(async () => {
    await Clipboard.setStringAsync(modal.einspruchText || '');
    showToast({ message: 'Vorlage kopiert', tone: 'success', icon: 'checkmark-circle' });
  }, [modal, showToast]);

  const handleShareEinspruch = useCallback(async () => {
    if (!modal.einspruchText) return;
    const result = await Share.share({ message: modal.einspruchText, title: 'Einspruch' });
    if (result.action === Share.sharedAction) {
      showToast({ message: 'Einspruch geteilt', tone: 'success', icon: 'share-outline' });
    }
    beginActionSession({
      actionType: 'appeal',
      title: 'Einspruch fertiggestellt?',
      message: 'Wenn Sie den Einspruch versendet oder vorbereitet haben, speichern wir den Schritt direkt am Dokument.',
      onConfirm: () => actions.commitOutcome('appeal'),
    });
  }, [modal, beginActionSession, actions, showToast]);

  const handleOpenBankingApp = useCallback(async () => {
    const paymentData = modal.activeModal?.data;
    if (!paymentData?.onOpenBanking) return;

    const result = await paymentData.onOpenBanking();
    modal.close();

    if (result?.opened) {
      beginActionSession({
        actionType: 'pay',
        title: 'Zahlung abgeschlossen?',
        message: 'Sind Sie mit der Überweisung fertig? Dann markieren wir das Dokument direkt als erledigt.',
        onMarkPaid: paymentData.onMarkPaid,
      });
      return;
    }

    modal.open('notice', {
      title: 'Banking-App nicht gefunden',
      message: result?.copied
        ? 'Die Zahlungsdaten wurden kopiert. Öffnen Sie Ihre Banking-App manuell und fügen Sie die Daten dort ein.'
        : 'Es konnte keine Banking-App geöffnet werden.',
    });
  }, [modal, beginActionSession]);

  return (
    <>
      <PremiumToast config={toastConfig} onHide={hideToast} />

      {/* More menu */}
      <AppSheet
        visible={moreMenu}
        onClose={() => setMoreMenu(false)}
        title="Mehr"
        subtitle="Zusätzliche Aktionen, Freigaben und Werkzeuge für dieses Dokument."
        footer={
          <AppButton
            label="Zurück"
            variant="secondary"
            onPress={() => setMoreMenu(false)}
          />
        }
      >
        {moreItems.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            onPress={item.onPress ?? undefined}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              borderBottomWidth: index < moreItems.length - 1 ? 0.5 : 0,
              borderBottomColor: C.border,
            }}
          >
            <Text style={{ fontSize: 17 }}>{item.icon}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: item.destructive ? C.danger : C.text }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </AppSheet>

      {/* Payment */}
      <AppSheet
        visible={modal.isOpen('payment')}
        onClose={modal.close}
        title={modal.activeModal?.data?.title || 'Zahlung vorbereiten'}
        subtitle="Möchten Sie jetzt in Ihre Banking-App wechseln und die Überweisung vorbereiten?"
        footer={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <AppButton label="Später" variant="secondary" onPress={modal.close} style={{ flex: 1 }} />
            <AppButton label="Banking-App öffnen" onPress={handleOpenBankingApp} style={{ flex: 1 }} />
          </View>
        }
      >
        <View style={[st.infoCard, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={st.infoRow}>
            <Text style={[st.infoLabel, { color: C.textTertiary }]}>Betrag</Text>
            <Text style={[st.infoValue, { color: C.text }]}>{String(modal.activeModal?.data?.amount ?? '')}</Text>
          </View>
          <View style={[st.infoDivider, { backgroundColor: C.border }]} />
          <View style={st.infoRow}>
            <Text style={[st.infoLabel, { color: C.textTertiary }]}>Empfänger</Text>
            <Text style={[st.infoValue, { color: C.text }]}>{String(modal.activeModal?.data?.recipient ?? '')}</Text>
          </View>
          {!!modal.activeModal?.data?.iban && (
            <>
              <View style={[st.infoDivider, { backgroundColor: C.border }]} />
              <View style={st.infoRow}>
                <Text style={[st.infoLabel, { color: C.textTertiary }]}>IBAN</Text>
                <Text style={[st.infoValue, { color: C.text }]}>{String(modal.activeModal?.data?.iban ?? '')}</Text>
              </View>
            </>
          )}
          {!!modal.activeModal?.data?.reference && (
            <>
              <View style={[st.infoDivider, { backgroundColor: C.border }]} />
              <View style={st.infoRow}>
                <Text style={[st.infoLabel, { color: C.textTertiary }]}>Verwendung</Text>
                <Text style={[st.infoValue, { color: C.text }]}>{String(modal.activeModal?.data?.reference ?? '')}</Text>
              </View>
            </>
          )}
          {!!modal.activeModal?.data?.partnerEmail && (
            <>
              <View style={[st.infoDivider, { backgroundColor: C.border }]} />
              <View style={st.infoRow}>
                <Text style={[st.infoLabel, { color: C.textTertiary }]}>Partner</Text>
                <Text style={[st.infoValue, { color: C.text }]}>{String(modal.activeModal?.data?.partnerEmail ?? '')}</Text>
              </View>
            </>
          )}
        </View>
      </AppSheet>

      {/* Confirm */}
      <AppSheet
        visible={modal.isOpen('confirm')}
        onClose={modal.close}
        title={modal.activeModal?.data?.title || 'Bestätigung'}
        subtitle={modal.activeModal?.data?.message || ''}
        footer={
          <View style={{ gap: 8 }}>
            {(modal.activeModal?.data?.actions || []).map((action: any, index: number) => (
              <AppButton
                key={`${action.text}-${index}`}
                label={action.text}
                variant={action.style === 'destructive' ? 'danger' : action.style === 'cancel' ? 'secondary' : 'primary'}
                onPress={() => { modal.close(); action.onPress?.(); }}
              />
            ))}
          </View>
        }
      />

      {/* Notice */}
      <AppSheet
        visible={modal.isOpen('notice')}
        onClose={modal.close}
        title={modal.activeModal?.data?.title || 'Hinweis'}
        subtitle={modal.activeModal?.data?.message || ''}
        footer={<AppButton label="Verstanden" onPress={modal.close} />}
      />

      {/* Options */}
      <AppSheet
        visible={modal.isOpen('options')}
        onClose={modal.close}
        title={modal.activeModal?.data?.title || 'Auswahl'}
        subtitle={modal.activeModal?.data?.message || ''}
      >
        {(modal.activeModal?.data?.options || []).map((option: any, index: number, arr: any[]) => (
          <TouchableOpacity
            key={`${option.text}-${index}`}
            onPress={() => { modal.close(); option.onPress?.(); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              borderBottomWidth: index < arr.length - 1 ? 0.5 : 0,
              borderBottomColor: C.border,
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: option.style === 'cancel' ? '600' : '500',
              color: option.style === 'destructive' ? C.danger : C.text,
            }}>
              {option.text}
            </Text>
          </TouchableOpacity>
        ))}
      </AppSheet>

      {/* Einspruch */}
      <AppSheet
        visible={modal.isOpen('einspruch')}
        onClose={modal.close}
        title="Einspruch-Vorlage"
        subtitle="Prüfen Sie den Entwurf, kopieren Sie ihn oder teilen Sie ihn weiter."
        footer={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleCopyEinspruch}
              style={[st.sheetButton, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>Kopieren</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareEinspruch}
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
              {modal.einspruchText || 'Es ist noch kein Text verfügbar.'}
            </Text>
          </ScrollView>
        </View>
      </AppSheet>

      <ActionSimulatorModal
        visible={modal.isOpen('simulator')}
        onClose={modal.close}
        dok={dok}
      />

      <EditDocumentModal
        visible={modal.isOpen('edit')}
        onClose={modal.close}
        onSave={actions.handleEditSpeichern}
        state={state}
        modal={modal}
      />

      <AufgabenModal
        visible={modal.isOpen('aufgaben')}
        onClose={modal.close}
        onAdd={() => actions.handleAufgabeHinzufuegen(modal, dokId, dispatch)}
        modal={modal}
      />

      <FormularModal
        visible={modal.isOpen('formular')}
        onClose={modal.close}
        onCopyWiderspruch={async () => { await actions.handleFormularCopyWiderspruch?.(); modal.close(); }}
        onMailWiderspruch={async () => { await actions.handleFormularMailWiderspruch?.(); modal.close(); }}
        onCopyPayment={async () => { await actions.handleFormularCopyPayment?.(); modal.close(); }}
      />

      <ErledigtModal
        visible={modal.isOpen('erledigt')}
        onClose={() => {
          const shouldBack = pendingMarkRef.current;
          pendingMarkRef.current = false;
          modal.close();
          if (shouldBack) router.back();
        }}
        erledigt={dok?.erledigt}
        betrag={dok?.betrag as number | null}
        onConfirm={() => {
          if (dok?.erledigt) {
            dispatch({ type: 'UNMARK_ERLEDIGT', id: dokId });
          } else {
            pendingMarkRef.current = true;
            dispatch({ type: 'MARK_ERLEDIGT', id: dokId });
          }
        }}
        onUndo={() => {
          pendingMarkRef.current = false;
          dispatch({ type: 'UNMARK_ERLEDIGT', id: dokId });
        }}
      />

      <SicherTeilenModal
        visible={modal.isOpen('sicherTeilen')}
        onClose={modal.close}
        dok={dok}
        onSelectTTL={(ttl: string) => actions.handleSicherTeilenMitTTL(ttl)}
      />

      <YanıtSablonlariModal
        visible={modal.isOpen('yanitSablon')}
        onClose={modal.close}
        dok={dok}
      />

      <KurumlarRehberiModal
        visible={modal.isOpen('kurumlar')}
        onClose={modal.close}
        dokTyp={dok?.typ}
      />

      <BelgeAciklamaModal
        visible={modal.isOpen('aciklama')}
        onClose={modal.close}
        dok={dok}
      />

      <HilfeModal
        visible={modal.isOpen('hilfe')}
        onClose={modal.close}
        dokTyp={dok?.typ}
      />

      <BelgeChatModal
        visible={modal.isOpen('chat')}
        onClose={modal.close}
        dok={dok}
      />
    </>
  );
}

const st = StyleSheet.create({
  sheetButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 14,
  },
  infoRow:     { gap: 4 },
  infoLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  infoValue:   { fontSize: 15, fontWeight: '700' },
  infoDivider: { height: 0.5, marginVertical: 12 },
});
