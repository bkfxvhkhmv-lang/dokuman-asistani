# BriefPilot — Architecture & roadmap

Bu dosya güncel repoyu yansıtır. Eski “monolit yapı” maddeleri çoğu **tamamlandı**: `utils/` modül ayrımı, `DetailModalsContainer`, `useDetailScreenAnimations`, `useActionSessionManager`, `v4FileService.ts`, tasarımda **`AuroraBackground`**.

## Tamamlanan (referans)

- **Akıllı aksiyon yönlendirmesi** — `runDetailSmartAction` (`src/features/detail/services/detailSmartRouting.ts`).
- **V4 API** — Zod ile `explainDocument` / `deltaSync` cevapları (`src/services/zodSchemas.ts` + `v4Api.ts`).
- **TS** — `"noImplicitAny": true` (`tsconfig.json`).
- **PDF** — görüntüden PDF; birleştirme; bölmek (`split*`); AcroForm tespiti; metin alanı doldurma (`fillPdfTextFields`).
- **Bulut (S6)** — `GoogleDriveProvider.listFolderChildren`; Dropbox path tabanlı; OneDrive Graph `items/{id}/children`.
- **Magic Eraser (S7)** — yer tutucu `MagicEraser.ts` (tam inpainting ayrı Ar-Ge fazı).

Ayrıntılı beta tablosu: `docs/BETA_FEATURES_S3_S7.md`.

## İsteğe bağlı iyileştirmeler (ürün sırasına göre)

| Konu | Not |
|------|-----|
| **Form overlay UI** | `inspectAcroFormPdfBytes` / `fillPdfTextFields` API hazır; ekrandan değer toplayıp export akışına bağlamak UX işi. |
| **Pdf merge/split kullanıcı ekranı** | Motor var; gerekiyorsa `PdfMergeDragModal` / benzeri bileşeni akışla tam bağla. |
| **iCloud derin entegrasyon** | `docs` + `iCloudDocuments.ts`; File Provider tam senaryosu native taraflı. |
| **Magic inpainting** | Maske boru hattı + Skia; `MAGIC_ERASER_PIPELINE_ENABLED` ile şartlı açılır. |

## Eskiden “orta öncelik” diyen işler → durum

- **Demo veri**: `src/data/demoData.ts`.
- **`v4Api.ts` ayırımı**: `v4FileService.ts` yapılmış.
- **ROADMAP #8 Detail modal stack**: `DetailModalsContainer` mevcut.

---

*Bakım: Büyük özellik eklendiğinde bu dosyayı ve `docs/BETA_FEATURES_S3_S7.md` satırlarını senkronize edin.*
