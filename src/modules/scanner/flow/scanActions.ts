import { pdfUploadService } from '@/pdf';
import { type PostCaptureAction } from '@features/scan/components/post-capture-sheet/types';
import { getLang } from '@/hooks/useLangPreference';
import { scanT } from '@/i18n/scanStrings';
import { archiveDocument } from '@/modules/scanner/flow/archiveDocument';
import type { StoreAction } from '@/store';

type SheetAction = {
  label: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
};

type ShowSheetFn = (cfg: {
  title: string;
  message?: string;
  icon?: string;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  actions: SheetAction[];
}) => void;

interface ExecuteScanActionDeps {
  action: PostCaptureAction;
  pageCount: number;
  /** Mevcut batch'teki sayfaların kalıcılaştırılacak URI listesi (sıralı) */
  sourceUris: string[];
  runDiagnose: () => void;
  clearPages: () => void;
  onCloseFlow: () => void;
  /**
   * Belge kaydedildikten sonra Detail ekranına git.
   * Verilmezse sadece sheet kapanır + clearPages çalışır.
   */
  onArchived?: (dokId: string) => void;
  /** Sıra sayacı için mevcut belgeler (store snapshot) */
  existingDocs?: import('@/store').Dokument[];
  showSheet: ShowSheetFn;
  hideSheet: () => void;
  generatePdf: () => Promise<{ uri: string; pageCount: number; fileSize: number } | null>;
  dispatch: (action: StoreAction) => void;
}

function pageLabel(pageCount: number): string {
  return `${pageCount} Seite${pageCount > 1 ? 'n' : ''}`;
}

export async function executeScanAction({
  action,
  pageCount,
  sourceUris,
  runDiagnose,
  clearPages,
  onCloseFlow,
  onArchived,
  showSheet,
  hideSheet,
  generatePdf,
  dispatch,
  existingDocs = [],
}: ExecuteScanActionDeps): Promise<void> {
  const lang = await getLang();
  const t = (key: string, vars?: Record<string, string>) => scanT(lang, key, vars);

  try {
    if (action === 'diagnose' || action === 'brief' || action === 'analyse') {
      runDiagnose();
      return;
    }

    if (action === 'edit') {
      return;
    }

    // ── ARCHIVE / SAVE_ONLY ──────────────────────────────────────────────
    // OCR/AI olmadan, sayfaları kalıcı olarak documentDirectory'ye taşır
    // ve store'a minimum metadata ile ekler. Kullanıcı belgeye sonra
    // tekrar dönüp düzenleyebilir / paylaşabilir.
    if (action === 'archive' || action === 'save_only') {
      try {
        const { dokId } = await archiveDocument({ sourceUris, dispatch, existingDocs });
        showSheet({
          title:   t('scan.archived_title'),
          message: t('scan.archived_message', { count: pageLabel(pageCount) }),
          icon:    'checkmark-circle',
          tone:    'success',
          actions: [{
            label: t('scan.ok'),
            variant: 'primary',
            onPress: () => {
              hideSheet();
              clearPages();
              if (onArchived) onArchived(dokId);
              else onCloseFlow();
            },
          }],
        });
      } catch (e) {
        console.warn('[scanActions] archive failed', e);
        showSheet({
          title:   t('scan.error'),
          message: t('scan.archive_failed') || 'Beim Archivieren ist ein Fehler aufgetreten.',
          icon:    'alert-circle',
          tone:    'danger',
          actions: [{ label: t('scan.ok'), variant: 'primary', onPress: hideSheet }],
        });
      }
      return;
    }

    if (action === 'advanced') {
      showSheet({
        title:   t('scan.advanced_title'),
        message: t('scan.advanced_message'),
        icon:    'construct',
        tone:    'default',
        actions: [{ label: t('scan.ok'), variant: 'primary', onPress: hideSheet }],
      });
      return;
    }

    // ── EXPORT ───────────────────────────────────────────────────────────
    // ÖNEMLİ DEĞİŞİKLİK: Eskiden sadece PDF üretip paylaşıyordu, paylaşım
    // iptal edilirse belge kayboluyordu. Artık ÖNCE arşive kaydediyoruz,
    // SONRA paylaşıyoruz. Paylaşımdan vazgeçilse bile belge güvende.
    showSheet({
      title:   t('scan.pdf_building'),
      message: t('scan.processing_pages', { count: pageLabel(pageCount) }),
      icon:    'document',
      tone:    'default',
      actions: [],
    });

    let archivedId: string | null = null;
    try {
      const { dokId } = await archiveDocument({ sourceUris, dispatch, existingDocs });
      archivedId = dokId;
    } catch (e) {
      console.warn('[scanActions] export → archive failed', e);
      // Arşive yazamazsa export'u durdur — kayıp riskini önlemek bu noktada
      // PDF üretmekten daha öncelikli.
      hideSheet();
      showSheet({
        title:   t('scan.error'),
        message: t('scan.archive_failed') || 'Beim Speichern ist ein Fehler aufgetreten.',
        icon:    'alert-circle',
        tone:    'danger',
        actions: [{ label: t('scan.ok'), variant: 'primary', onPress: hideSheet }],
      });
      return;
    }

    const pdfResult = await generatePdf();
    hideSheet();

    if (!pdfResult) {
      // PDF üretilemedi ama belge zaten arşivde — kullanıcıya bunu söyle
      showSheet({
        title:   t('scan.error'),
        message: t('scan.pdf_failed_but_saved')
          || 'PDF konnte nicht erzeugt werden, das Dokument wurde aber gespeichert.',
        icon:    'alert-circle',
        tone:    'warning',
        actions: [{
          label: t('scan.ok'),
          variant: 'primary',
          onPress: () => {
            hideSheet();
            clearPages();
            if (archivedId && onArchived) onArchived(archivedId);
            else onCloseFlow();
          },
        }],
      });
      return;
    }

    await pdfUploadService.sharePdf(pdfResult.uri, t('scan.action_export'));

    // Paylaşım sonrası akışı kapat (paylaşıldı veya iptal — fark etmez,
    // belge zaten arşivde)
    clearPages();
    if (archivedId && onArchived) onArchived(archivedId);
    else onCloseFlow();
  } catch (err) {
    console.warn('[scanActions] unexpected error', err);
    hideSheet();
    showSheet({
      title:   t('scan.error'),
      message: t('scan.pdf_failed'),
      icon:    'alert-circle',
      tone:    'danger',
      actions: [{ label: t('scan.ok'), variant: 'primary', onPress: hideSheet }],
    });
  }
}
