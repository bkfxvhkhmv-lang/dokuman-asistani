# Local Project Hub Index

Mac'teki merkezi hub klasörüne referans.

---

## Mac Ana Hub

```
~/Desktop/BRIEFPILOT_PROJECT_HUB/
```

## Alt Bölümler

| Bölüm | Path | İçerik |
|---|---|---|
| **OCR** | `~/Desktop/BRIEFPILOT_PROJECT_HUB/OCR/` | Dataset/model/config/log/report |
| **Client** | `~/Desktop/BRIEFPILOT_PROJECT_HUB/BRIEFPILOT_CLIENT/` | Raporlar, exports, backups |
| **Backend** | `~/Desktop/BRIEFPILOT_PROJECT_HUB/BACKEND/` | Planlar, raporlar |
| **Reports** | `~/Desktop/BRIEFPILOT_PROJECT_HUB/PROJECT_REPORTS/` | Delete candidates, genel raporlar |

## Hangi Dosya Nerede?

| Dosya | Nerede |
|---|---|
| V6 dataset tar.gz (Mac yedek) | `~/Desktop/BRIEFPILOT_OCR_DATASETS/v6_comprehensive_80k.tar.gz` |
| V6 dataset açık hali | `~/Desktop/BRIEFPILOT_OCR_DATASETS/v6_charfix_80k/` |
| Mevcut best model | `~/Downloads/OCR_MODEL_INVENTORY/modeller/aktif/ppocrv4_w480_...BEST.tar.gz` |
| OCR training configs | `~/Desktop/BRIEFPILOT_PROJECT_HUB/OCR/configs/` + `bp_canavar_v6_refactor/ocr/configs/` |
| OCR artifact manifest | `~/Desktop/BRIEFPILOT_PROJECT_HUB/OCR/OCR_ARTIFACTS_MANIFEST_2026-05-14.md` |
| Checksums | `~/Desktop/BRIEFPILOT_PROJECT_HUB/OCR/checksums_2026-05-14.sha256` |
| Client status | `~/Desktop/BRIEFPILOT_PROJECT_HUB/BRIEFPILOT_CLIENT/CLIENT_STATUS_INDEX_2026-05-14.md` |
| Backend status | `~/Desktop/BRIEFPILOT_PROJECT_HUB/BACKEND/BACKEND_STATUS_INDEX_2026-05-14.md` |
| Delete candidates | `~/Desktop/BRIEFPILOT_PROJECT_HUB/PROJECT_REPORTS/2026-05-14/DELETE_CANDIDATES_2026-05-14.md` |
| Hub ana indeks | `~/Desktop/BRIEFPILOT_PROJECT_HUB/PROJECT_HUB_INDEX_2026-05-14.md` |

## Büyük Dosyalar Git'e Girmedi

- `*.tar.gz` → `.gitignore`'da bloklu
- `*.pdparams`, `*.pdopt`, `*.states` → bloklu
- `*.log` → bloklu
- Dataset klasörleri → bloklu

## Arama Keywords

```
OCR  L40S  V6  RunPod  2026-05-14  char_boost
v6_comprehensive_80k  SHA58ecc207  ppocrv4  best_accuracy
be0c86287  2bb581cea  2beda0d6c
artifact_registry  BRIEFPILOT_PROJECT_HUB
```
