# Local Cleanup Summary — 2026-05-14

---

## Mac Hub Düzeni

```
~/Desktop/BRIEFPILOT_PROJECT_HUB/
├── OCR/
│   ├── configs/          ← v5/v6 yml dosyaları ✅
│   ├── logs/             ← training loglar ✅
│   ├── reports/          ← status raporları ✅
│   ├── datasets/         ← (büyük binary: BRIEFPILOT_OCR_DATASETS'te)
│   ├── models/           ← (büyük binary: Downloads/OCR_MODEL_INVENTORY'de)
│   ├── checkpoints/      ← (büyük binary: placeholder)
│   ├── archives_failed_runs/ ← (RunPod'dan eğitim bitince indirilecek)
│   ├── OCR_ARTIFACTS_MANIFEST_2026-05-14.md ✅
│   └── checksums_2026-05-14.sha256 ✅
├── BRIEFPILOT_CLIENT/
│   └── CLIENT_STATUS_INDEX_2026-05-14.md ✅
├── BACKEND/
│   └── BACKEND_STATUS_INDEX_2026-05-14.md ✅
├── PROJECT_REPORTS/2026-05-14/
│   ├── DELETE_CANDIDATES_2026-05-14.md ✅
│   ├── DUPLICATE_CANDIDATES_2026-05-14.md ✅
│   └── EMPTY_AND_DUPLICATE_CLEANUP_2026-05-14.md ✅
├── REVIEW_REQUIRED/
│   ├── old_backups/
│   ├── duplicate_candidates/
│   ├── unknown_archives/
│   └── old_ocr_artifacts/
└── PROJECT_HUB_INDEX_2026-05-14.md ✅
```

## Silinen Güvenli Dosyalar

| Tür | Sayı |
|---|---|
| `.DS_Store` | 22 |
| `__pycache__` | 17 |
| `.pytest_cache` | 1 |
| **Toplam** | **40** |

Tahmini boşaltılan alan: ~5-10 MB

## Silinmeyen (Onay Bekliyor)

- canonical-doc-factory `output_*` klasörleri (~252 MB toplam)
- Eski OCR datasets (v2/v3/v4) (~970 MB)
- bp_ backup klasörleri (~1-2 GB)
- `ppocrv4_w480_v2_raw_checkpoints.tar.gz` (661 MB)

Tam liste: `PROJECT_REPORTS/2026-05-14/DELETE_CANDIDATES_2026-05-14.md`

## REVIEW_REQUIRED Listesi

- `bp_canavar_v6_refactor/117` (0 byte, kaynak bilinmiyor)
- `bp_canavar_v6_refactor/backend/0001` (0 byte, kaynak bilinmiyor)
- bp_ backup klasörleri (Nisan 2026)

## Duplicate Aday Raporu

Path: `PROJECT_REPORTS/2026-05-14/DUPLICATE_CANDIDATES_2026-05-14.md`

## V6 Dataset Audit Sonucu ✅ TEMİZ

- Train: 68,000 / Val: 12,000
- >45 char: 0 / >50 char: 0
- OOV chars: {} (boş)
- Train/Val overlap: 0
- Kritik char coverage: q @ & + ; = ? ! ° ² ( ) → **hepsi >0** ✅
- Space handling: 169,390 space ✅ (use_space_char=true)

## Binary Dosya Git'e Girmedi

`.gitignore` kuralları aktif. Sadece dokümanlar commit edildi.

## V6 RunPod Training

PID 9928 aktif, global_step 2000 eval: acc 0.5378. Step 4000 eval bekleniyor.
