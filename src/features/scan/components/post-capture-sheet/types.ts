/** Post-capture seçim sheet aksiyon türleri. */

export type PostCaptureAction =
  | 'diagnose'
  | 'archive'
  | 'export'
  | 'edit'
  | 'advanced'
  | 'brief'
  | 'analyse'
  | 'save_only'
  | 'add_page';

export interface PostCaptureActionSheetProps {
  pageCount: number;
  /** Örn. "Zahlungsaufforderung · 14 Tage · Risiko: Mittel" */
  briefInsight?: string;
  onSelect: (action: PostCaptureAction) => void;
}
