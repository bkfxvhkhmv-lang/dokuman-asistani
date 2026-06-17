/**
 * Bir taramayı OCR / AI analizi olmadan, **sadece arşivlemek** için
 * kullanılan yardımcı.
 *
 * Davranış:
 *  1. `persistScanFiles` ile tüm sayfa görüntülerini cacheDirectory'den
 *     documentDirectory/scans/<dokId>/ altına kalıcı kopyalar.
 *  2. Minimum metadata ile `Dokument` objesi oluşturur:
 *     - typ: 'Sonstiges'  (henüz sınıflandırılmadı)
 *     - titel: offline fallback (YYYY-MM-DD · Scan NN)
 *     - kalıcı page URI listesi
 *  3. Store'a `ADD_DOKUMENT` dispatch eder.
 *  4. Yeni belgenin id'sini döndürür — caller dilerse Detail'e
 *     yönlendirebilir.
 *
 * Bu fonksiyon **OCR çağırmaz, ağa çıkmaz, AI çalıştırmaz**. Sadece
 * "şimdi kaybolmasın, sonra dönerim" akışıdır.
 */
import {
  generateId,
} from '@/utils';
import type {
  Dokument,
  ScannedPage,
  StoreAction,
} from '@/store';
import { persistScanFiles } from '@/modules/scanner/storage/scanFileStorage';
import { buildOfflineFallbackTitle } from '@/utils/offlineFallbackTitle';

interface ArchiveOptions {
  /** Tarama sayfalarının kaynak URI'leri (cacheDirectory'de olabilir) */
  sourceUris: string[];
  /** Opsiyonel kullanıcı başlığı — customTitle olarak saklanır; titel weak kalır */
  customTitle?: string | null;
  /** Yeni belge için varsayılan tip (genelde 'Sonstiges' kalır) */
  typ?: string;
  /** Sıra sayacı için mevcut belgeler */
  existingDocs?: Dokument[];
  /** Store dispatcher */
  dispatch: (action: StoreAction) => void;
}

interface ArchiveResult {
  dokId: string;
  pages: ScannedPage[];
  document: Dokument;
}

export async function archiveDocument({
  sourceUris,
  customTitle,
  typ = 'Sonstiges',
  existingDocs = [],
  dispatch,
}: ArchiveOptions): Promise<ArchiveResult> {
  if (sourceUris.length === 0) {
    throw new Error('archiveDocument: en az bir sayfa gerekli');
  }

  const dokId = generateId();
  const pages = await persistScanFiles(dokId, sourceUris);
  const importDate = new Date();
  const titel = buildOfflineFallbackTitle({
    source: 'scan',
    importDate,
    existingDocs,
  });

  const document: Dokument = {
    id:              dokId,
    titel,
    typ,
    absender:        'Unbekannt',
    zusammenfassung: null,
    warnung:         null,
    betrag:          null,
    waehrung:        '€',
    frist:           null,
    risiko:          'niedrig',
    aktionen:        [],
    datum:           importDate.toISOString(),
    gelesen:         true,   // kullanıcı zaten az önce tarayıp arşivledi
    erledigt:        false,
    uri:             pages[0]?.uri ?? null,
    pages,
    rohText:         null,
    confidence:      null,
    favorit:         false,
    customTitle:     customTitle?.trim() || null,
    importSource:    'scan',
    archiveBehavior: 'manual',  // OCR/analiz yapılmadan arşivlendi
  };

  dispatch({ type: 'ADD_DOKUMENT', payload: document });

  return { dokId, pages, document };
}
