/**
 * Kalıcı tarama dosyası saklama katmanı.
 *
 * Sorumluluk:
 *  - cacheDirectory'deki geçici tarama görüntülerini documentDirectory
 *    altına `scans/<dokId>/page-<n>.<ext>` şeması ile kalıcı kopyalar.
 *  - Bir belge silindiğinde ilgili klasörü temizler.
 *  - Belge başına "her sayfa hangi gerçek dosyada?" sorusunun tek cevabı.
 *
 * Neden var?
 *  cacheDirectory işletim sistemi tarafından **uyarısız** silinebilir
 *  (özellikle iOS düşük disk veya Android storage cleaner). Eğer belge
 *  URI'leri cache'i göstermeye devam ederse, kullanıcı uygulamayı bir
 *  süre sonra açtığında PDF'leri kayıp görür. Bu modül buna karşı tek
 *  hatti savunmadır.
 */
// Legacy API — projenin geri kalanı (SkiaDocumentOptimizer, PdfGenerator,
// OcrManager, vs.) hep `/legacy` import'u kullaniyor. Yeni FileSystem
// (Paths/File/Directory) henuz tum platformlarda stabil degil.
import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from '@/utils';
import type { ScannedPage } from '@/store';

/** Tüm taramalar bu klasörün altında dokId'ye göre yaşar. */
export const SCANS_ROOT = `${FileSystem.documentDirectory}scans/`;

function dokDir(dokId: string): string {
  return `${SCANS_ROOT}${dokId}/`;
}

function extOf(uri: string): string {
  const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return (m?.[1] ?? 'jpg').toLowerCase();
}

/**
 * Bir belgeye ait tüm sayfaları kalıcı klasöre kopyala.
 *
 * - Hedef klasör yoksa oluşturulur.
 * - Kopyalama paralel yapılır; bir sayfa başarısız olursa hata yukarı
 *   atılır (parça doluluk teslim edilmez).
 * - Dönen `ScannedPage[]` listesi ekleme sırasında atanan `order` ile
 *   1 tabanlıdır.
 *
 * @param dokId   Hedef belge kimliği (klasör adı olur)
 * @param sources Kaynak URI'ler (sıralı — 0. eleman 1. sayfa olur)
 */
export async function persistScanFiles(
  dokId: string,
  sources: string[],
): Promise<ScannedPage[]> {
  if (!dokId) throw new Error('persistScanFiles: dokId zorunludur');
  if (sources.length === 0) return [];

  const dir = dokDir(dokId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const now = new Date().toISOString();

  return Promise.all(
    sources.map(async (src, i) => {
      if (!src) {
        throw new Error(`persistScanFiles: sayfa ${i + 1} için kaynak URI bos`);
      }
      const target = `${dir}page-${i + 1}.${extOf(src)}`;

      // Eğer kaynak zaten doğru hedefse (aynı belgeyi yeniden persist
      // ediyorsak), kopyalamaya gerek yok.
      if (src === target) {
        const info = await FileSystem.getInfoAsync(target);
        if (info.exists) {
          return {
            id:        generateId(),
            uri:       target,
            order:     i + 1,
            rotation:  0 as const,
            createdAt: now,
          };
        }
      }

      await FileSystem.copyAsync({ from: src, to: target });

      return {
        id:        generateId(),
        uri:       target,
        order:     i + 1,
        rotation:  0 as const,
        createdAt: now,
      };
    }),
  );
}

/**
 * Bir belgeyi sildiğinde ilgili klasörü tamamen kaldır.
 * Hata olursa sessizce yutulur — silinme zaten optimistik bir aksiyon.
 */
export async function deleteScanFiles(dokId: string): Promise<void> {
  if (!dokId) return;
  try {
    const dir = dokDir(dokId);
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }
  } catch {
    // sessizce yut — UI tarafı hatadan etkilenmez
  }
}

/**
 * Bir belgenin tüm sayfa dosyaları gerçekten dosya sisteminde var mı?
 * Detail/PDF üretiminde kullanıcıya "bu belge artık erişilemez"
 * uyarısı verebilmek için.
 */
export async function verifyScanFiles(pages: ScannedPage[]): Promise<{
  ok: boolean;
  missing: string[];
}> {
  const missing: string[] = [];
  for (const p of pages) {
    const info = await FileSystem.getInfoAsync(p.uri);
    if (!info.exists) missing.push(p.uri);
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Mevcut sayfa listesine yeni dosya(lar) ekleyip persist eder.
 * Yeniden tara / sayfa ekle akışında kullanılır.
 */
export async function appendScanFiles(
  dokId: string,
  existingPages: ScannedPage[],
  newSources: string[],
): Promise<ScannedPage[]> {
  if (newSources.length === 0) return existingPages;

  const dir = dokDir(dokId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const startOrder = existingPages.length;
  const now = new Date().toISOString();

  const appended = await Promise.all(
    newSources.map(async (src, i) => {
      const order = startOrder + i + 1;
      const target = `${dir}page-${order}.${extOf(src)}`;
      await FileSystem.copyAsync({ from: src, to: target });
      return {
        id:        generateId(),
        uri:       target,
        order,
        rotation:  0 as const,
        createdAt: now,
      };
    }),
  );

  return [...existingPages, ...appended];
}
