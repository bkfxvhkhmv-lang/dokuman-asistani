# BriefPilot OCR Model Registry

Tüm model'ler external artifact'tır. Git'e commit edilmez.
Checksums: `artifacts/checksums.sha256`

---

## Model Kayıtları

### ppocrv4_w480_splitaddr_v4 — Current Best Stable

| Alan | Değer |
|---|---|
| Run adı | `gpu_v4_splitaddr_w480` |
| Accuracy | **95.21%** |
| norm_edit_dis | 0.991 |
| FPS | 792 |
| Dataset | ppocrv4_10k_splitaddr_umlaut_v1 |
| Architecture | SVTR_LCNet + MultiHead |
| Status | ✅ **Üretim adayı** |
| Lokal path | `~/Downloads/OCR_MODEL_INVENTORY/modeller/aktif/` |
| Dosya | `ppocrv4_w480_splitaddr_v4_pct9521_BEST.tar.gz` |
| Notlar | Kısa label'lar ve splitaddr odaklı; v6 dataset eksiklerini taşır |

---

### v5_l40s_w480_len50_b64 — Abandoned

| Alan | Değer |
|---|---|
| Run adı | `v5_l40s_ppocrv4_mobile_w480_len50_b64` |
| Son acc | ~0.42 (global_step 8000) |
| Status | ❌ **Durduruldu** |
| Sebep | Dataset mismatch + validation instability |
| Arşiv | `/workspace/archive_failed_v5_w480_len50_b64_20260514_0945.tar.gz` |
| Notlar | max_text_length=50 ve w480 doğruydu ama dataset char coverage eksikti |

---

### v6_l40s_w480_len50_b64 — Pending Training

| Alan | Değer |
|---|---|
| Run adı | `v6_l40s_ppocrv4_mobile_w480_len50_b64` |
| Status | ⏳ **Eğitim bekliyor** |
| Dataset | v6_comprehensive_80k |
| Config | `ocr/configs/v6_l40s_ppocrv4_mobile_w480_len50_b64.yml` |
| Log hedef | `/workspace/train_l40s_v6_w480_len50_b64.log` |
| Output hedef | `/workspace/output/v6_l40s_ppocrv4_mobile_w480_len50_b64` |
| Beklenen acc | >95.5% |

---

## Geçmiş Runs (Mac Local)

| Run | Dataset | Acc | Not |
|---|---|---|---|
| mac_balanced_v21_w480_e3 | balanced_v21 | 93.8% | İlk büyük sıçrama |
| gpu_v2_officialDocs_run2 | officialDocs_60k | 93.89% | GPU ilk stabil run |

---

## Karar Kriteri

| Acc | Durum |
|---|---|
| ≥ 96.0% | Production candidate, inference export |
| 93–96% | Usable, v7 dataset planı |
| < 93% | Production'a alma, config/data analiz |
