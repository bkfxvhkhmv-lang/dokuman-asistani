import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
import type { Dokument, StoreAction } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import {
  copyFormToClipboard,
  openMailWithForm,
  prefillPaymentForm,
} from '@/services/formFillerService';

type OpenNotice = (title: string, message: string) => void;
type OpenOptions = (
  title: string,
  message: string,
  options?: Array<{ text: string; style?: string; onPress?: () => void }>
) => void;

export async function runFormularCopyWiderspruch(dok: Dokument | undefined, openNotice: OpenNotice): Promise<void> {
  if (!dok) return;
  await copyFormToClipboard(dok);
  openNotice('Kopiert', 'Widerspruch-Vorlage wurde in die Zwischenablage kopiert.');
}

export async function runFormularMailWiderspruch(dok: Dokument | undefined, openNotice: OpenNotice): Promise<void> {
  if (!dok) return;
  try {
    await openMailWithForm(dok);
  } catch (e: unknown) {
    openNotice('Fehler', (e as Error).message);
  }
}

export async function runFormularCopyPayment(dok: Dokument | undefined, openNotice: OpenNotice): Promise<void> {
  if (!dok) return;
  const pf = prefillPaymentForm(dok);
  await Clipboard.setStringAsync(
    `Empfänger: ${pf.empfaenger}\nIBAN: ${pf.iban}\nBetrag: ${pf.betrag}\nVerwendung: ${pf.verwendung}`
  );
  openNotice('Kopiert', 'Zahlungsdaten wurden kopiert.');
}

export async function runKontaktVerknuepfen(params: {
  dokId: string;
  dispatch: (action: StoreAction) => void;
  setKontaktName: (name: string) => void;
  openNotice: OpenNotice;
  openOptions: OpenOptions;
}): Promise<void> {
  const { dokId, dispatch, setKontaktName, openNotice, openOptions } = params;
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    openNotice('Kein Zugriff', 'Bitte erlauben Sie den Kontaktzugriff.');
    return;
  }
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name] });
  if (!data.length) {
    openNotice('Keine Kontakte', 'Ihr Adressbuch ist leer.');
    return;
  }
  const options = data.slice(0, 20).map(c => ({
    text: c.name ?? '',
    onPress: () => {
      setKontaktName(c.name ?? '');
      dispatch({ type: 'UPDATE_DOKUMENT', payload: { id: dokId, kontaktName: c.name } });
    },
  }));
  options.push({ text: 'Abbrechen', onPress: () => {} });
  openOptions('Kontakt verknüpfen', 'Wählen Sie einen Kontakt:', options);
}

export function runAufgabeHinzufuegen(
  modalArg: ModalController,
  dokIdArg: string,
  dispatchArg: (action: StoreAction) => void,
): void {
  if (!modalArg.neueAufgabeTitel.trim()) return;
  dispatchArg({
    type: 'ADD_AUFGABE',
    dokId: dokIdArg,
    payload: {
      id: Date.now().toString(36),
      titel: modalArg.neueAufgabeTitel.trim(),
      faellig: modalArg.neueAufgabeFrist || null,
      verantwortlich: modalArg.neueAufgabeVerantwortlich.trim() || null,
      erledigt: false,
      datum: new Date().toISOString(),
    } as any,
  });
  modalArg.setNeueAufgabeTitel('');
  modalArg.setNeueAufgabeFrist('');
  modalArg.setNeueAufgabeVerantwortlich('');
  modalArg.close();
}
