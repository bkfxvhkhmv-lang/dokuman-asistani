import type { ModalController } from '@/features/detail/hooks/useModalController';

export type DetailDocumentActions = ReturnType<
  typeof import('@/features/detail/hooks/useDocumentActions').useDocumentActions
>;

/**
 * Tek `switch`: Smart özelliklerden gelen aksiyon anahtarları (tab’lar ve özet kartları ortak kullanır).
 */
export function runDetailSmartAction(
  key: string,
  deps: { actions: DetailDocumentActions; modal: ModalController },
): void {
  const { actions, modal } = deps;

  switch (key) {
    case 'zahlen':
      actions.handleZahlen();
      break;
    case 'einspruch':
      actions.handleEinspruch();
      break;
    case 'kalender':
      actions.handleKalender();
      break;
    case 'erledigt':
      actions.handleErledigt();
      break;
    case 'teilen':
      actions.handleTeilen(modal.anonModus);
      break;
    case 'teilen_anonym':
      actions.handleGuvenliPaylasim();
      break;
    case 'pdf_export':
      actions.handlePDF();
      break;
    case 'ai_erklären':
      modal.open('aciklama');
      break;
    case 'ai_chat':
      modal.open('chat');
      break;
    case 'bearbeiten':
      actions.handleEdit();
      break;
    case 'aufgabe_hinzufügen':
      modal.open('aufgaben');
      break;
    default:
      break;
  }
}
