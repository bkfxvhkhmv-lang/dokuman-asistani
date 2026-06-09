/**
 * S4 — AcroForm keşfi (pdf-lib). Overlay / doldurma UI’si ayrı; bu modül yalnızca tespit.
 */
import { PDFDocument } from 'pdf-lib';

export interface AcroFormInspectResult {
  hasForm: boolean;
  fieldCount: number;
  /** pdf-lib alan adları (nested / tam nitelikli olabilir). */
  fieldNames: string[];
}

export async function inspectAcroFormPdfBytes(pdfBytes: Uint8Array): Promise<AcroFormInspectResult> {
  if (!pdfBytes?.length) {
    return { hasForm: false, fieldCount: 0, fieldNames: [] };
  }
  try {
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdf.getForm();
    const fields = form.getFields();
    const fieldNames = fields
      .map(f => {
        try {
          return f.getName();
        } catch {
          return '';
        }
      })
      .filter((n): n is string => !!n?.length);
    return {
      hasForm: fields.length > 0,
      fieldCount: fields.length,
      fieldNames,
    };
  } catch {
    return { hasForm: false, fieldCount: 0, fieldNames: [] };
  }
}
