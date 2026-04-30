/**
 * PDF paylaşımı ve hazırlık — sistem paylasim sheet'i (MIME application/pdf).
 * Ileri asamada multipart / presigned PUT buraya tasinabilir (S3).
 */
import * as Sharing from 'expo-sharing';

export class PdfUploadService {
  /** Paylasim yapilabilir mi (simulator/disabled sistemler false). */
  async isSharingAvailable(): Promise<boolean> {
    return Sharing.isAvailableAsync();
  }

  /** Sistem PDF paylasimi — dialog basligi kullanici dilinde. */
  async sharePdf(uri: string, dialogTitle: string): Promise<boolean> {
    const ok = await this.isSharingAvailable();
    if (!ok) return false;
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle });
    return true;
  }
}

export const pdfUploadService = new PdfUploadService();
