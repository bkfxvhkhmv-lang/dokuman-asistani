# Related Files — 2026-05-14

Bu klasördeki ana rapora referans veren tüm dosyalar.

## Doğrudan İlgili

| Dosya | Açıklama |
|---|---|
| [MASTER_STATUS_REPORT_2026-05-14.md](MASTER_STATUS_REPORT_2026-05-14.md) | **Ana rapor** (bu klasör) |
| [../../datasets/v6_DATASET_MANIFEST.md](../../datasets/v6_DATASET_MANIFEST.md) | V6 dataset detayları, audit, upload planı |
| [../../models/OCR_MODEL_REGISTRY.md](../../models/OCR_MODEL_REGISTRY.md) | Tüm model kayıtları |
| [../../BRIEFPILOT_STATUS_REPORT_2026-05-14.md](../../BRIEFPILOT_STATUS_REPORT_2026-05-14.md) | Günün özet raporu (desktop kopyası da var) |
| [../../OCR_L40S_TRAINING_STANDARD.md](../../OCR_L40S_TRAINING_STANDARD.md) | L40S GPU kurulum ve eğitim standardı |

## Artifact / Registry

| Dosya | Açıklama |
|---|---|
| [../../../artifacts/README.md](../../../artifacts/README.md) | Artifact kayıt sistemi |
| [../../../artifacts/checksums.sha256](../../../artifacts/checksums.sha256) | SHA256 hash'ler (v6 dataset dahil) |

## Plan Dokümanları

| Dosya | Açıklama |
|---|---|
| [../../backend/OCR_BACKEND_INTEGRATION_PLAN.md](../../backend/OCR_BACKEND_INTEGRATION_PLAN.md) | Backend API ve env planı |
| [../../client/BRIEFPILOT_CLIENT_NEXT_STEPS.md](../../client/BRIEFPILOT_CLIENT_NEXT_STEPS.md) | Client UI sonraki adımlar |
| [../../ai/DOCUMENT_AI_STRATEGY.md](../../ai/DOCUMENT_AI_STRATEGY.md) | AI/LLM stratejisi |

## OCR Kod

| Dosya | Açıklama |
|---|---|
| [../../../ocr/configs/v6_l40s_ppocrv4_mobile_w480_len50_b64.yml](../../../ocr/configs/v6_l40s_ppocrv4_mobile_w480_len50_b64.yml) | V6 eğitim config |
| [../../../ocr/generators/char_boost.py](../../../ocr/generators/char_boost.py) | Eksik char'lar için özel generator |

## Test

| Dosya | Açıklama |
|---|---|
| [../../../src/__tests__/BriefPilotBugFixes.test.ts](../../../src/__tests__/BriefPilotBugFixes.test.ts) | 23 regression test (23/23 PASS) |

## Dışsal (Git'te değil)

| Dosya | Lokal Path | SHA256 |
|---|---|---|
| v6_comprehensive_80k.tar.gz | `~/Desktop/BRIEFPILOT_OCR_DATASETS/` | `58ecc207...` |
| archive_failed_v5_...tar.gz | `/workspace/` (RunPod) | — |
| V6 model checkpoint (eğitim bittikten sonra) | `/workspace/output/v6_.../best_accuracy.*` | — |
