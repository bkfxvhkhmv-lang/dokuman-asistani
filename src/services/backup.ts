import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import type { StoreState, StoreAction } from '../store';

const BACKUP_DIR = (FileSystem.documentDirectory ?? '') + 'backups/';
const AUTO_KEY   = '@briefpilot_auto_backup';

interface BackupPayload {
  version: number;
  exportDatum: string;
  dokumente: StoreState['dokumente'];
  einstellungen: StoreState['einstellungen'];
}

type Dispatch = (action: StoreAction) => void;

export async function exportYedek(state: StoreState): Promise<boolean> {
  try {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });

    const payload: BackupPayload = {
      version: 3,
      exportDatum: new Date().toISOString(),
      dokumente: state.dokumente,
      einstellungen: state.einstellungen,
    };

    const tarih    = new Date().toISOString().slice(0, 10);
    const dateiName = `briefpilot_backup_${tarih}.json`;
    const pfad      = BACKUP_DIR + dateiName;

    await FileSystem.writeAsStringAsync(pfad, JSON.stringify(payload, null, 2));

    const verfuegbar = await Sharing.isAvailableAsync();
    if (verfuegbar) {
      await Sharing.shareAsync(pfad, {
        mimeType: 'application/json',
        dialogTitle: 'BriefPilot Sicherung',
        UTI: 'public.json',
      });
    } else {
      Alert.alert('✓ Gespeichert', `Sicherung unter:\n${pfad}`);
    }
    return true;
  } catch (e: unknown) {
    Alert.alert('Fehler', 'Sicherung fehlgeschlagen: ' + (e as Error).message);
    return false;
  }
}

export async function importYedek(dispatch: Dispatch): Promise<boolean> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return false;

    const raw     = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const payload = JSON.parse(raw) as BackupPayload;

    if (!payload.dokumente || !Array.isArray(payload.dokumente)) {
      Alert.alert('Ungültige Datei', 'Diese Datei ist keine gültige BriefPilot-Sicherung.');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Sicherung wiederherstellen?',
        `${payload.dokumente.length} Dokumente vom ${payload.exportDatum?.slice(0, 10) || '?'}\n\nAktuelle Daten werden überschrieben.`,
        [
          { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Wiederherstellen', style: 'destructive',
            onPress: async () => {
              dispatch({ type: 'LOAD', payload: {
                dokumente: payload.dokumente,
                einstellungen: payload.einstellungen || {} as StoreState['einstellungen'],
              }});
              Alert.alert('✓ Wiederhergestellt', `${payload.dokumente.length} Dokumente geladen.`);
              resolve(true);
            },
          },
        ],
      );
    });
  } catch (e: unknown) {
    Alert.alert('Fehler', 'Datei konnte nicht gelesen werden: ' + (e as Error).message);
    return false;
  }
}

export async function autoYedekSpeichern(state: StoreState): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    const payload: BackupPayload = {
      version: 3,
      exportDatum: new Date().toISOString(),
      dokumente: state.dokumente,
      einstellungen: state.einstellungen,
    };
    const pfad = BACKUP_DIR + 'auto_backup.json';
    await FileSystem.writeAsStringAsync(pfad, JSON.stringify(payload));
    await AsyncStorage.setItem(AUTO_KEY, new Date().toISOString());
  } catch {}
}

export async function letzteAutoYedekTarih(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(AUTO_KEY);
  return raw
    ? new Date(raw).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
}

export async function autoYedekWiederherstellen(dispatch: Dispatch): Promise<boolean> {
  try {
    const pfad = (FileSystem.documentDirectory ?? '') + 'backups/auto_backup.json';
    const info = await FileSystem.getInfoAsync(pfad);
    if (!info.exists) return false;
    const raw     = await FileSystem.readAsStringAsync(pfad);
    const payload = JSON.parse(raw) as BackupPayload;
    if (!payload.dokumente) return false;
    dispatch({ type: 'LOAD', payload: {
      dokumente: payload.dokumente,
      einstellungen: payload.einstellungen || {} as StoreState['einstellungen'],
    }});
    return true;
  } catch { return false; }
}
