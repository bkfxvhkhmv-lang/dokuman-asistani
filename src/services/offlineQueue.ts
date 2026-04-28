import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { generateId } from '../utils';
import { uploadDocumentV4Safe } from './v4Api';
import type { StoreAction } from '../store';

const QUEUE_KEY = '@briefpilot_ocr_queue';

interface QueueEntry {
  id: string;
  uris: string[];
  datum: string;
}

type Dispatch = (action: StoreAction) => void;

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!(state.isConnected && state.isInternetReachable);
  } catch {
    return false;
  }
}

export async function kueueHinzufuegen(uris: string[], dispatch: Dispatch): Promise<string> {
  const eintrag: QueueEntry = {
    id: generateId(),
    uris,
    datum: new Date().toISOString(),
  };
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueueEntry[] = raw ? JSON.parse(raw) : [];
  queue.push(eintrag);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  dispatch({
    type: 'ADD_DOKUMENT',
    payload: {
      id: eintrag.id,
      titel: 'Scan ausstehend…',
      typ: 'Sonstiges',
      absender: 'Wird analysiert wenn Online',
      zusammenfassung: 'Dieses Dokument wird analysiert, sobald eine Internetverbindung besteht.',
      warnung: null, betrag: null, waehrung: '€',
      frist: null, risiko: 'niedrig', aktionen: [],
      datum: eintrag.datum,
      gelesen: true, erledigt: false,
      uri: uris[0], rohText: null, iban: null, confidence: null,
    } as any,
  });
  return eintrag.id;
}

export async function queueVerarbeiten(dispatch: Dispatch): Promise<number> {
  const online = await isOnline();
  if (!online) return 0;

  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return 0;
  const queue: QueueEntry[] = JSON.parse(raw);
  if (queue.length === 0) return 0;

  let verarbeitet = 0;
  const uebrig: QueueEntry[] = [];

  for (const eintrag of queue) {
    try {
      const filename = `offline_${eintrag.id}.jpg`;
      const result = await uploadDocumentV4Safe(eintrag.uris[0], filename);

      dispatch({
        type: 'UPDATE_DOKUMENT',
        payload: {
          id: eintrag.id,
          v4DocId: (result as any).id,
          titel: (result as any).titel || 'Dokument hochgeladen',
        },
      });

      verarbeitet++;
    } catch {
      uebrig.push(eintrag);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(uebrig));
  return verarbeitet;
}

export async function ausstehendAnzahl(): Promise<number> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return 0;
  return (JSON.parse(raw) as QueueEntry[]).length;
}
