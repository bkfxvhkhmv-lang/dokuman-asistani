/**
 * Tum domain tipleri tek bir yerde toplanmistir. Icerik orijinal
 * `src/store.tsx`'ten 1:1 cikarildi; davranis degisikligi yok.
 *
 * Modulerlik gerekceleri:
 *  - Tip degisiklikleri reducer veya provider degisikligi gerektirmeden
 *    izlenebilir.
 *  - Test/storybook dosyalari sadece tipleri import edebilir.
 *  - Backend sema senkronu icin tek bir referans dosyasi.
 */
import type { EntityBox } from '@/services/visionApi';

export interface Aufgabe {
  id: string;
  titel: string;
  erledigt: boolean;
  faellig?: string | null;
  prioritaet?: 'hoch' | 'mittel' | 'niedrig';
  verantwortlich?: string | null;
}

export interface DokumentVersion {
  datum: string;
  felder: Record<string, unknown>;
  altRohText?: string;
}

export interface ActionHistoryEntry {
  status: string;
  stamp: string;
  label: string;
  timeline: string;
  createdAt: string;
}

/**
 * Tek bir taranmis sayfanin kalici temsili.
 *
 * - `uri` -> `documentDirectory/scans/<dokId>/page-<n>.jpg` formatinda
 *   KALICI bir yola isaret etmelidir. Kameranin gecici cacheDirectory
 *   ciktisi ASLA buraya yazilmaz; kayit sirasinda `persistScanFiles`
 *   ile kopyalanir.
 * - `order` -> 1 tabanli (ilk sayfa = 1). Siralama, goruntuleme ve PDF
 *   uretiminde kanonik kaynaktir.
 * - `rotation` -> 0 / 90 / 180 / 270; render zamaninda uygulanir.
 *   Dosya kendisi dondurulmez; metadata ile yapilir.
 */
export interface ScannedPage {
  id: string;
  /** Runtime absolute URI — rehydrated from relativePath on load. Never store cacheDirectory paths. */
  uri: string;
  /** Path relative to FileSystem.documentDirectory, e.g. "scans/<dokId>/page-1.jpg".
   *  Survives app container UUID changes; uri is recomputed from this on load. */
  relativePath?: string;
  order: number;
  rotation?: 0 | 90 | 180 | 270;
  width?: number;
  height?: number;
  ocrText?: string | null;
  ocrConfidence?: number | null;
  createdAt?: string;
}

export interface Dokument {
  id: string;
  titel: string;
  typ: string;
  absender: string;
  zusammenfassung: string | null;
  warnung: string | null;
  betrag: number | null;
  waehrung: string;
  frist: string | null;
  /** Frist tarihi takvime yazıldıysa bildir şeridi gizlenir */
  fristImKalender?: boolean;
  risiko: 'hoch' | 'mittel' | 'niedrig';
  aktionen: string[];
  datum: string;
  gelesen: boolean;
  erledigt: boolean;
  uri: string | null;
  rohText: string | null;
  /** OCR/backend tarafından tespit edilen belge dili, örn. "de", "fr", "tr". */
  detectedLanguage?: string | null;
  /** Backend OCR job ID — learning loop correction events için. */
  ocrJobId?: string | null;
  versionen?: DokumentVersion[];
  aufgaben?: Aufgabe[];
  etiketten?: string[];
  favorit?: boolean;
  profilId?: string | null;
  sichtbarBis?: string | null;
  iban?: string | null;
  confidence?: number | null;
  kurzfassung?: string | null;
  // Workflow
  workflowStatus?: string;
  workflowStamp?: string;
  workflowColor?: string;
  workflowTimeline?: string;
  workflowUpdatedAt?: string;
  hideFromTasks?: boolean;
  archiveBehavior?: string | null;
  actionHistory?: ActionHistoryEntry[];
  // V4 sync
  v4DocId?: string | null;
  /** Sunucu OCR/decision job: pending → processing → completed | failed */
  v4JobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
  dateiName?: string | null;
  kontaktName?: string | null;
  version?: number;
  isDeleted?: boolean;
  _lastSyncAt?: string | null;
  _hasConflict?: boolean;
  // V12 Smart Auto-Fill fields
  aktenzeichen?: string | null;
  garantieBis?: string | null;
  kundennr?: string | null;
  rechnungsnr?: string | null;
  vertragsnr?: string | null;
  zahlungszweck?: string | null;
  steuerid?: string | null;
  // Contract fields
  laufzeitende?: string | null;
  kuendigungsfrist?: string | null;
  // V12 Categorization
  subtyp?: string | null;
  // #53 OCR bounding boxes for detected entities
  entityBoxes?: EntityBox[];
  /**
   * Kalici sayfa listesi. Bir taramadan veya sonradan eklenmis
   * sayfalardan olusur. Bos/undefined ise belge goruntu tabanli degildir
   * (manuel olusturulmus kart, demo, vb.).
   *
   * Sayfa URI'leri `documentDirectory/scans/<dokId>/` altina persist
   * edilir; cacheDirectory'den **asla** dogrudan kullanilmazlar.
   */
  pages?: ScannedPage[];
  /** relativePath of the lead source file (first page), relative to documentDirectory.
   *  Used to rehydrate dok.uri when the sandbox container UUID changes. */
  fileRelativePath?: string | null;
  /** Original unsigned PDF uri — set when user signs. Allows reverting to unsigned. */
  unsignedUri?: string | null;
  /** Henuz OCR/analiz tamamlanmamis optimistic placeholder bayragi */
  isOptimistic?: boolean;
  /** Demo modu belgeleri — kullanici verisine karistirilmaz */
  isDemo?: boolean;
  /** Kullanicinin verdigi ozel baslik (otomatik uretilen titel'i ezerse) */
  customTitle?: string | null;
  /** Belgede yazan tarih (fatura/karar/mektup tarihi) — datum scan tarihidir, bu belge tarihidir */
  dokumentDatum?: string | null;
  /**
   * Nutzerdefinierter Ordner Pfad („Firma 2026 / Auto“), getrennt von `typ`:
   * `typ` = automatische Hauptkategorie, `userOrdner` = persönliche Ablage.
   */
  userOrdner?: string | null;
  // Internal
  _duplikat?: boolean;
  _aehnlichScore?: number;
  _betragAnonymisiert?: string | null;
}

export interface FilterKombi {
  id: string;
  [key: string]: unknown;
}

export interface KlassorRegel {
  absenderPattern: string;
  [key: string]: unknown;
}

export interface LernRegel {
  id: string;
  absenderPattern: string;
  felder: Record<string, unknown>;
  anwendungen: number;
  erstellt: string;
  label: string;
}

export interface Profil {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Kisayol {
  id: string;
  [key: string]: unknown;
}

export interface AktiveSablon {
  dokId: string;
  sablonId: string;
  [key: string]: unknown;
}

export interface BudgetTarget {
  id:          string;   // 'gesamt' | typ key e.g. 'Rechnung'
  label:       string;
  limitBetrag: number;   // monthly cap in euros
}

export interface Einstellungen {
  sprache: string;
  benachrichtigungen: boolean;
  datenschutzModus: boolean;
  appSperre: boolean;
  ordnerNamen: Record<string, string>;
  filterKombis: FilterKombi[];
  eylemZinciri: { aktiv: boolean; schritte: string[] };
  klassorRegeln: KlassorRegel[];
  etikettenVerlauf: string[];
  aktiveSablonlari: AktiveSablon[];
  partnerEmail: string;
  kisayollar: Kisayol[];
  lernRegeln: LernRegel[];
  profile: Profil[];
  aktifProfilId: string | null;
  budgetTargets: BudgetTarget[];
}

export interface StoreState {
  dokumente: Dokument[];
  einstellungen: Einstellungen;
  _duplikat: boolean;
}
