/**
 * AcroForm metin alanlarını programmatic doldurma (pdf-lib).
 * Checkbox / dropdown için ayrı genişletme gerekir.
 */
import { PDFDocument, PDFTextField } from 'pdf-lib';

export interface FillPdfTextFieldsResult {
  bytes: Uint8Array;
  /** `values` ile eşleşerek doldurulan alan sayısı. */
  appliedCount: number;
}

/**
 * Bilinen ada sahip PDF text alanlarını string değerlere göre günceller.
 * Yazılı görünüm için görünümler güncellenir (`updateFieldAppearances`).
 */
export async function fillPdfTextFields(
  pdfBytes: Uint8Array,
  values: Readonly<Record<string, string>>,
): Promise<FillPdfTextFieldsResult | null> {
  if (!pdfBytes?.length) return null;
  try {
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdf.getForm();
    let appliedCount = 0;

    for (const field of form.getFields()) {
      let name: string;
      try {
        name = field.getName();
      } catch {
        continue;
      }
      const value = values[name];
      if (value === undefined) continue;
      if (!(field instanceof PDFTextField)) continue;

      field.setText(value);
      appliedCount++;
    }

    try {
      form.updateFieldAppearances();
    } catch {
      /* bazı karma PDF’lerde font eksik uyarısı; setText kalır */
    }

    const out = await pdf.save();
    return { bytes: out, appliedCount };
  } catch (e) {
    console.warn('[pdf-lib] fillPdfTextFields failed', e);
    return null;
  }
}
