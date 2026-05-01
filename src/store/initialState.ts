/**
 * Baslangic state'i ve persistence anahtari.
 *
 * AsyncStorage anahtarini buraya tasidik cunku hem persistence
 * katmaninin hem de potansiyel migration script'lerinin tek bir
 * referansa ihtiyaci vardir.
 */
import { DEMO_DOKUMENTE } from '@/features/demo/demoDocuments';
import type { StoreState } from '@/store/types';

/** AsyncStorage anahtari. v3 = bu app'in 3. major surumunden buyana. */
export const STORE_KEY = '@briefpilot_v3';

export const INITIAL_STATE: StoreState = {
  dokumente: DEMO_DOKUMENTE,
  einstellungen: {
    sprache: 'Deutsch',
    benachrichtigungen: true,
    datenschutzModus: true,
    appSperre: false,
    ordnerNamen: {},
    filterKombis: [],
    eylemZinciri: { aktiv: false, schritte: ['hatirlatici'] },
    klassorRegeln: [],
    etikettenVerlauf: [],
    aktiveSablonlari: [],
    partnerEmail: '',
    kisayollar: [],
    lernRegeln: [],
    profile: [],
    aktifProfilId: null,
    budgetTargets: [],
  },
  _duplikat: false,
};
