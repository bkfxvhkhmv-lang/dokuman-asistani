/**
 * StoreAction discriminated union — tum aksiyonlarin tek listesi.
 *
 * Reducer'lar bu birlesik tipe gore dallanir; yeni bir aksiyon eklemek
 * icin once buraya `type` katmasi gerekir, sonra ilgili reducer
 * dosyasinda case yazilir. Bu yontem TypeScript exhaustiveness'i ile
 * birlikte "kayip aksiyon" hatalarini compile zamani yakalar.
 */
import type {
  StoreState,
  Dokument,
  Aufgabe,
  Einstellungen,
  FilterKombi,
  KlassorRegel,
  LernRegel,
  Profil,
  Kisayol,
  AktiveSablon,
  ActionHistoryEntry,
} from '@/store/types';

export type StoreAction =
  | { type: 'LOAD'; payload: Partial<StoreState> }
  | { type: 'ADD_DOKUMENT'; payload: Dokument }
  | { type: 'UPDATE_DOKUMENT'; payload: Partial<Dokument> & { id: string } }
  | { type: 'DELETE_DOKUMENT'; id: string }
  | { type: 'MARK_GELESEN'; id: string }
  | { type: 'MARK_ERLEDIGT'; id: string }
  | { type: 'UNMARK_ERLEDIGT'; id: string }
  | {
      type: 'APPLY_ACTION_OUTCOME';
      id: string;
      outcome: ActionHistoryEntry & {
        color?: string;
        hideFromTasks?: boolean;
        archiveBehavior?: string | null;
      };
    }
  | { type: 'UPDATE_EINSTELLUNGEN'; payload: Partial<Einstellungen> }
  | { type: 'TOGGLE_FAVORIT'; id: string }
  | { type: 'CLEAR_DUPLIKAT' }
  | { type: 'SAVE_FILTER_KOMBI'; payload: Omit<FilterKombi, 'id'> }
  | { type: 'DELETE_FILTER_KOMBI'; id: string }
  | { type: 'ADD_KLASSOR_REGEL'; payload: KlassorRegel }
  | { type: 'DELETE_KLASSOR_REGEL'; absenderPattern: string }
  | { type: 'ADD_AUFGABE'; dokId: string; payload: Aufgabe }
  | { type: 'UPDATE_AUFGABE'; dokId: string; payload: Partial<Aufgabe> & { id: string } }
  | { type: 'DELETE_AUFGABE'; dokId: string; aufgabeId: string }
  | { type: 'SET_SICHTBAR_BIS'; id: string; sichtbarBis: string | null }
  | { type: 'ADD_LERN_REGEL'; payload: LernRegel }
  | { type: 'DELETE_LERN_REGEL'; id: string }
  | { type: 'INCREMENT_LERN_ANWENDUNG'; id: string }
  | { type: 'ADD_PROFIL'; payload: Profil }
  | { type: 'DELETE_PROFIL'; id: string }
  | { type: 'SET_AKTIF_PROFIL'; id: string | null }
  | { type: 'SET_DOK_PROFIL'; id: string; profilId: string | null }
  | { type: 'ADD_KISAYOL'; payload: Kisayol }
  | { type: 'DELETE_KISAYOL'; id: string }
  | { type: 'ADD_SABLON'; payload: AktiveSablon }
  | { type: 'REMOVE_SABLON'; dokId: string; sablonId: string }
  | { type: 'UPDATE_ETIKETTEN'; id: string; etiketten: string[] };
