# V6 Dataset Manifest — v6_comprehensive_80k

*SHA256: `58ecc207406f51efd69572006ccbe64f72c23f5f17e9125fa97f136ac0c5980f`*

---

## V5 Neden Başarısız Oldu

### 1. max_text_length uyumsuzluğu (kritik)
- V5 config'de `max_text_length: 25` kullanıldı.
- Train label'larının **%61'i (41,724/68,000)** 25 karakterden uzundu.
- Model uzun label'ları asla görmedi → ilk eval'lar düşük (acc ~0.57).
- Düzeltme: `max_text_length: 50`

### 2. Sıfır örnekli karakterler (kritik)
Dict'te tanımlı ama training'de hiç örnek olmayan 14 karakter:
`q @ & + ; = ? ! ° ² ( ) Ç ć č ś`

Bu karakterleri içeren gerçek belgelerle modele sorulduğunda **%0 doğruluk**.

### 3. degraded_scan yetersizliği
- V5'te sadece **%4** (3,200 sample) degraded scan vardı.
- Gerçek faks/fotokopi kalitesindeki belgeler için yetersiz.
- Düzeltme: **%10** (8,000 sample)

### 4. Width uyumsuzluğu
- Bazı run'larda `w320` kullanıldı, dataset `w480` için üretilmişti.
- Bu mismatch model stabilizasyonunu bozdu.

---

## V6 Değişiklikleri

| Özellik | V5 | V6 |
|---|---|---|
| max_text_length | 25 (hatalı) | **50** |
| image width | 320/480 (karışık) | **480** |
| char_boost kategori | Yok | **%6 (4,080 train)** |
| degraded_scan | %4 | **%10** |
| sıfır örnekli char | 14 karakter | **0** |
| Train satırı | 68,000 | 68,000 |
| Val satırı | 12,000 | 12,000 |

---

## Audit Sonuçları

| Metrik | Train | Val |
|---|---|---|
| Satır sayısı | 68,000 | 12,000 |
| Missing image | 0 | 0 |
| Unreadable image | 0 | 0 |
| Train/Val overlap | 0 | — |
| Length p50/p90/p95/p99 | 27/39/41/45 | 26/37/39/44 |
| Max uzunluk | 45 | 45 |
| >25 char | 40,476 | 6,715 |
| >50 char | **0** | **0** |

### Kritik Karakter Coverage

| Char | Train Count | Status |
|---|---|---|
| q | 185 | ✓ |
| @ | 150 | ✓ |
| & | 457 | ✓ |
| + | 663 | ✓ |
| ; | 380 | ✓ |
| = | 358 | ✓ |
| ? | 404 | ✓ |
| ! | 136 | ✓ |
| ° | 367 | ✓ |
| ² | 568 | ✓ |
| ( | 454 | ✓ |
| ) | 454 | ✓ |

---

## Önerilen Training Config

```yaml
Global:
  max_text_length: 50
  use_space_char: true
  character_dict_path: /workspace/dataset/dict/german_dict.txt

Architecture:
  algorithm: SVTR_LCNet          # MultiHead, NOT CRNN
  Head:
    name: MultiHead

Train:
  dataset:
    data_dir: /workspace/dataset/rec/train
  loader:
    batch_size_per_card: 64
    num_workers: 8
  sampler:
    first_bs: 64
    fix_bs: true
    scales: [[480,32],[480,48],[480,64]]

Eval:
  dataset:
    data_dir: /workspace/dataset/rec/val
  loader:
    batch_size_per_card: 96

# Image shapes (tümü width=480):
# d2s_train_image_shape: [3, 48, 480]
# RecConAug.image_shape: [48, 480, 3]
# RecConAug.max_text_length: 50
# RecResizeImg.image_shape: [3, 48, 480]
# NRTRHead.max_text_length: 50
```

**Run adı:** `v6_l40s_ppocrv4_mobile_w480_len50_b64`

---

## RunPod Upload Planı

```bash
# 1. Jupyter Lab ile /workspace/'e yükle
# 2. Hash doğrula:
sha256sum /workspace/v6_comprehensive_80k.tar.gz
# Beklenen: 58ecc207406f51efd69572006ccbe64f72c23f5f17e9125fa97f136ac0c5980f

# 3. Ayrı klasöre aç (aktif dataset'i bozmadan):
mkdir -p /workspace/dataset_v6_candidate
tar -xzf /workspace/v6_comprehensive_80k.tar.gz -C /workspace/dataset_v6_candidate

# 4. Doğrula:
wc -l /workspace/dataset_v6_candidate/v6_charfix_80k/paddle/rec/train/label.txt
# Beklenen: 68000

# 5. Eski dataset'i backup al, v6'yı aktifleştir:
mv /workspace/dataset /workspace/dataset_v5_backup
mkdir -p /workspace/dataset
cp -a /workspace/dataset_v6_candidate/v6_charfix_80k/paddle/* /workspace/dataset/
```
