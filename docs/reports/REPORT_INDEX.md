# BriefPilot Report Index

Tüm proje raporları bu indeksten erişilebilir.

---

## En Son Ana Rapor

📄 [MASTER_STATUS_REPORT_2026-05-14.md](2026-05-14_l40s_v6_ocr_backend_client_ai/MASTER_STATUS_REPORT_2026-05-14.md)

**Kapsam:** OCR V5 analizi, V6 dataset, L40S eğitim, artifact registry, backend/client/AI planları

---

## 2026-05-14 İlgili Raporlar

| Dosya | Konu |
|---|---|
| [docs/datasets/v6_DATASET_MANIFEST.md](../datasets/v6_DATASET_MANIFEST.md) | V6 dataset neden yapıldı, audit sonuçları, upload planı |
| [docs/models/OCR_MODEL_REGISTRY.md](../models/OCR_MODEL_REGISTRY.md) | Tüm model run'ları, status, accuracy |
| [docs/backend/OCR_BACKEND_INTEGRATION_PLAN.md](../backend/OCR_BACKEND_INTEGRATION_PLAN.md) | API endpoints, env vars, response format |
| [docs/client/BRIEFPILOT_CLIENT_NEXT_STEPS.md](../client/BRIEFPILOT_CLIENT_NEXT_STEPS.md) | Bekleyen UI işleri (Q&A, draft reply) |
| [docs/ai/DOCUMENT_AI_STRATEGY.md](../ai/DOCUMENT_AI_STRATEGY.md) | RAG → LoRA AI stratejisi |
| [artifacts/README.md](../../artifacts/README.md) | Artifact kayıtları ve upload prosedürü |
| [artifacts/checksums.sha256](../../artifacts/checksums.sha256) | SHA256 hash'ler |
| [docs/BRIEFPILOT_STATUS_REPORT_2026-05-14.md](../BRIEFPILOT_STATUS_REPORT_2026-05-14.md) | Önceki özet rapor |
| [docs/OCR_L40S_TRAINING_STANDARD.md](../OCR_L40S_TRAINING_STANDARD.md) | L40S kurulum standardı |

---

## 2026-06-17 Chain Audit

📄 [docs/audits/2026-06-17_upload-scan-analyze-chain-audit.md](../audits/2026-06-17_upload-scan-analyze-chain-audit.md)

**Kapsam:** Upload / Scan / Analysieren akışlarının yeni `briefpilot-clean/backend` OCR zincirini gerçekten kullanıp kullanmadığının denetimi.

**Ana bulgu:** Yeni backend PaddleOCR + PDF text-layer hızlı yolu sunucuda hazır, ancak uygulamadaki kullanıcıya dönük ana akışlar hâlâ eski OCR MVP (`api.briefpilot.app`) veya yerel Google Vision + SmartAutoFill üzerinden çalışıyor. Acil eylem: **Detail ekranı “Analysieren” butonu ve AI Labeler yeni backend’e taşınmalı.**

### #138 Migration Final Report

📄 [docs/audits/2026-06-17_138-analysieren-migration-final-report.md](../audits/2026-06-17_138-analysieren-migration-final-report.md)

**Kapsam:** Detail ekranı “Analysieren” butonunun eski OCR MVP’den yeni core-api backend’e taşınması — commit öncesi denetim raporu.

---

## Arama Keywords

```
L40S  V6  OCR  PaddleOCR  RunPod  2026-05-14
v6_comprehensive_80k  w480  len50  b64
best_accuracy  artifact_registry
be0c86287  2bb581cea
char_boost  degraded_scan
2026-06-17  upload  scan  analyse  OCR MVP  core-api
```

---

## Commit Referansları

| Commit | Mesaj | Kapsam |
|---|---|---|
| `2bb581cea` | fix: patch critical document pipeline bugs | 12 bug fix, 23 test |
| `be0c86287` | chore: add OCR artifact registry | docs + artifact yapısı |
| `(sonraki)` | docs: add master status report 2026-05-14 | Bu rapor |
