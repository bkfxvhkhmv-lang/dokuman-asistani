/**
 * Bir taramayı OCR / AI analizi olmadan, **sadece arşivlemek** için
 * kullanılan yardımcı.
 *
 * Davranış:
 *  1. `persistScanFiles` ile tüm sayfa görüntülerini cacheDirectory'den
 *     documentDirectory/scans/<dokId>/ altına kalıcı kopyalar.
 *  2. Minimum metadata ile `Dokument` objesi oluşturur:
 *     - typ: 'Sonstiges'  (henüz sınıflandırılmadı)
 *     - titel: tarih bazlı varsayılan ("Scan vom 28.04.2026 18:33")
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

interface ArchiveOptions {
  /** Tarama sayfalarının kaynak URI'leri (cacheDirectory'de olabilir) */
  sourceUris: string[];
  /** Opsiyonel kullanıcı başlığı — verilmezse otomatik tarih bazlı üretilir */
  customTitle?: string | null;
  /** Yeni belge için varsayılan tip (genelde 'Sonstiges' kalır) */
  typ?: string;
  /** Store dispatcher */
  dispatch: (action: StoreAction) => void;
}

interface ArchiveResult {
  dokId: string;
  pages: ScannedPage[];
  document: Dokument;
}

function defaultTitle(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Scan vom ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function archiveDocument({
  sourceUris,
  customTitle,
  typ = 'Sonstiges',
  dispatch,
}: ArchiveOptions): Promise<ArchiveResult> {
  if (sourceUris.length === 0) {
    throw new Error('archiveDocument: en az bir sayfa gerekli');
  }

  const dokId = generateId();
  const pages = await persistScanFiles(dokId, sourceUris);

  const titel = customTitle?.trim() || defaultTitle();

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
    datum:           new Date().toISOString(),
    gelesen:         true,   // kullanıcı zaten az önce tarayıp arşivledi
    erledigt:        false,
    uri:             pages[0]?.uri ?? null,
    pages,
    rohText:         null,
    confidence:      null,
    favorit:         false,
    customTitle:     customTitle?.trim() || null,
    archiveBehavior: 'manual',  // OCR/analiz yapılmadan arşivlendi
  };

  dispatch({ type: 'ADD_DOKUMENT', payload: document });

  return { dokId, pages, document };
}
