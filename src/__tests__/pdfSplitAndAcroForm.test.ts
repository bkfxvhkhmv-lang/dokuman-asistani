/**
 * Beta backlog S3 / S4 / S7 doğrulama — expo olmadan saf pdf-lib.
 */
import { PDFDocument } from 'pdf-lib';

import { inspectAcroFormPdfBytes } from '@/core/pdf/acroFormInspect';
import { fillPdfTextFields } from '@/core/pdf/fillPdfForm';
import { splitPdfBytesToSinglePagePdfs } from '@/core/pdf/jsPdfGenerate';
import { MAGIC_ERASER_PIPELINE_ENABLED, applyMagicEraser } from '@/modules/image-processing/engine/MagicEraser';

describe('pdf split (S3)', () => {
  it('Üç sayfalık pdf → üç tek sayfalı tampon', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.addPage();
    doc.addPage();
    const bytes = await doc.save();

    const out = await splitPdfBytesToSinglePagePdfs(bytes);
    expect(out?.length).toBe(3);
    for (const p of out ?? []) expect(p.byteLength).toBeGreaterThan(120);
  });
});

describe('AcroForm inspect (S4)', () => {
  it('Boş dökümanda form alanı raporlanmaz', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    const r = await inspectAcroFormPdfBytes(bytes);

    expect(r.fieldCount).toBe(0);
    expect(r.hasForm).toBe(false);
    expect(r.fieldNames).toEqual([]);
  });
});

describe('fillPdfTextFields (S4 fill)', () => {
  it('programatik text alanına yazı yazar', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.getForm().createTextField('invoice.name');

    const raw = await pdf.save();
    const r = await fillPdfTextFields(raw, { 'invoice.name': 'Test User' });

    expect(r?.appliedCount).toBeGreaterThanOrEqual(1);
    expect(r?.bytes.byteLength).toBeGreaterThan(200);
  });
});

describe('Magic eraser stub (S7)', () => {
  it('applyMagicEraser noop', async () => {
    expect(MAGIC_ERASER_PIPELINE_ENABLED).toBe(false);
    expect(await applyMagicEraser({ imageUri: 'file:///noop' })).toBeNull();
  });
});

