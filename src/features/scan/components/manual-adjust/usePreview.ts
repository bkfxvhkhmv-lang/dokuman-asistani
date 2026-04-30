/**
 * Manual Adjust onizleme uretimini debounced sekilde yoneten hook.
 *
 * - Identity degerlerde uretim atlanir; preview anlamsiz olur.
 * - Sequence numarasi ile race condition korunur (kullanici hizli
 *   slider hareketi yaparken eski cikti yeniyi ezmesin).
 * - Sheet kapaninca interval temizlenir.
 */
import { useEffect, useRef, useState } from 'react';
import {
  applyManualAdjustments,
  isIdentity,
  type ManualAdjustValues,
} from '@/modules/image-processing/engine/SkiaManualAdjuster';

const PREVIEW_DEBOUNCE_MS = 220;

interface PreviewState {
  /** Hesaplanmis preview URI'si (degerler identity ise null). */
  previewUri: string | null;
  /** Suanda hesaplama yapiliyor mu? */
  previewing: boolean;
}

/** Debounced preview yonetimi. Sheet acikken values degisimini izler. */
export function useManualAdjustPreview(
  visible: boolean,
  imageUri: string | null,
  values: ManualAdjustValues,
): PreviewState {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSeqRef  = useRef(0);

  useEffect(() => {
    if (!visible || !imageUri) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Identity -> hicbir gorsel etki yok; preview = orijinal.
    if (isIdentity(values)) {
      setPreviewUri(null);
      setPreviewing(false);
      return;
    }

    setPreviewing(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++previewSeqRef.current;
      try {
        const out = await applyManualAdjustments(imageUri, values);
        // Eski (out-of-date) sonuc gelirse atla.
        if (seq === previewSeqRef.current) {
          setPreviewUri(out !== imageUri ? out : null);
        }
      } catch {
        if (seq === previewSeqRef.current) setPreviewUri(null);
      } finally {
        if (seq === previewSeqRef.current) setPreviewing(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [values, imageUri, visible]);

  // Sheet kapaninca state'i sifirla
  useEffect(() => {
    if (!visible) {
      setPreviewUri(null);
      setPreviewing(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [visible]);

  return { previewUri, previewing };
}
