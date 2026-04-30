# Beta backlog S3–S7 durumu

Kapalı tanım: kod veya dokümantasyon taahhüdü; tam ürün vizyonunun tamamı ayrı fazlarda büyür.

| Kod | İçerik | Durum |
|-----|--------|-------|
| **S3 PDF** | `mergePdfUrisIntoFile`, `generatePdfFromImages`, **yeni:** `splitPdfBytesToSinglePagePdfs`, `splitPdfUriIntoPageUris` (`@/core/pdf`) | ✅ Motor + test |
| **S4 Form** | `inspectAcroFormPdfBytes` — alanlar; **`fillPdfTextFields`** — metin alanlarına yazım (checkbox vb. sonra) | ✅ Tespit + metin yazımı API |
| **S5 İmza** | `SignaturePdfSheet` + `stampSignatureOnLastPage` (çizgi + raster damga + paylaş) | ✅ Mevcut |
| **S6 Bulut** | `CloudFolderChild`, **`listFolderChildren`**: Drive (Graph), Dropbox (path/id `path_lower`), OneDrive (`items/id/children`); iOS not `iCloudDocuments.ts` | ✅ Liste API |
| **S7 Magic Eraser** | `MagicEraser.ts` — `MAGIC_ERASER_PIPELINE_ENABLED=false`, `applyMagicEraser` noop | Yer tutucu |

Test: `src/__tests__/pdfSplitAndAcroForm.test.ts`.
