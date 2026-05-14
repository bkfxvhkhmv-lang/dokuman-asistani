# BriefPilot OCR — L40S Training Standard
*Son güncelleme: 2026-05-14*

---

## Neden L40S Standart?

PP-OCRv4 SVTR_LCNet + MultiHead mimarisi gerçek anlamda iki head (CTC + NRTR) çalıştırır.
Bu konfigürasyonda:

| GPU | VRAM | Batch 96 | Durum |
|---|---|---|---|
| RTX 4090 | 24 GB | ~23 GB reserved | Sınırda, OOM riski |
| RTX A5000 | 24 GB | ~23 GB reserved | Sınırda, OOM riski |
| RTX 5090 | 32 GB | — | Paddle 2.x Blackwell desteği yok |
| **L40S** | **48 GB** | **~36 GB reserved** | **✅ Stabil** |

A5000 veya 4090 üzerinde CRNN konfigürasyonuyla eğitim yanlış yöndür:
- MultiHead yerine CTCHead → %63–64 civarında platonlaşır
- SVTR_LCNet ağırlıkları CRNN'e aktarılmaz → sıfırdan öğrenme

---

## Stabil Yazılım Kombinasyonu

```
GPU:     NVIDIA L40S 48 GB
Python:  3.12.3
Paddle:  2.6.1          ← 2.6.2 sorunlu, 2.6.1 kullan
NumPy:   1.26.4
CUDA:    11.8 (driver 580+)
cuDNN:   9.8
```

---

## Dataset / Checkpoint Path Standardı

```
/workspace/
  dataset/
    rec/
      train/
        crops/
        label.txt
      val/
        crops/
        label.txt
    dict/
      german_dict.txt       # 96 karakter
  checkpoint/
    briefpilot_ppocrv4_10k_splitaddr_umlaut_v1_w480/
      best_accuracy.pdparams
      best_accuracy.pdopt
      best_accuracy.states
  output/
    v5_l40s_ppocrv4_mobile_b96/   # aktif run
```

---

## Config Özeti (PP-OCRv4 Mobile Rec)

```yaml
Global:
  use_gpu:                true
  epoch_num:              30
  save_epoch_step:        2
  eval_batch_step:        [0, 2000]
  character_dict_path:    /workspace/dataset/dict/german_dict.txt
  max_text_length:        45
  use_space_char:         true
  pretrained_model:       /workspace/checkpoint/briefpilot_ppocrv4_10k_splitaddr_umlaut_v1_w480/best_accuracy

Architecture:
  algorithm:  SVTR_LCNet
  Head:
    name: MultiHead          # CTC + NRTR — CRNN yapma

Train.loader:
  batch_size_per_card:    96    # first_bs ile eşit
  first_bs:               96
  fix_bs:                 true

Eval.loader:
  batch_size_per_card:    128
```

---

## Eğitim Başlatma Komutu

```bash
# LD_LIBRARY_PATH (cuDNN) ayarla
export CUDNN_LIB=/usr/local/lib/python3.12/dist-packages/nvidia/cudnn/lib
export CUBLAS_LIB=/usr/local/lib/python3.12/dist-packages/nvidia/cublas/lib
export CUDA_NVRTC_LIB=/usr/local/lib/python3.12/dist-packages/nvidia/cuda_nvrtc/lib
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$CUDNN_LIB:$CUBLAS_LIB:$CUDA_NVRTC_LIB:/usr/local/nvidia/lib:/usr/local/nvidia/lib64:$LD_LIBRARY_PATH

cd /workspace/PaddleOCR
nohup python tools/train.py \
  -c /workspace/output/v5_l40s_ppocrv4_mobile_b96.yml \
  > /workspace/train_l40s_v5_b96.log 2>&1 &
```

---

## Sağlıklı Run Göstergeleri

İlk epoch'ta şunlar NORMAL:

```
acc: 0.00–0.30      — head katmanları yeniden öğreniyor
loss: 100–150       — başlangıç yüksek loss
norm_edit_dis: 0.04 — başlangıçta düşük
```

Epoch 3–5 arası beklenen:

```
acc:           0.65–0.75
norm_edit_dis: 0.91–0.93
loss:          3–5
ips:           190–240 samples/s
VRAM reserved: ~36 GB
```

Eğer epoch 5'te acc < 0.50 ise → config'i kontrol et (MultiHead mı CTCHead mı?).

---

## Mevcut Güncel Run Sonucu

**Run:** `gpu_v5_L40S_ppocrv4_mobile_b96`
**Dataset:** `v5_comprehensive_80k` (68k train / 12k val / 96 char dict)

İlk validation (epoch 3):
```
acc:           0.6705
norm_edit_dis: 0.9160
fps:           698.98
best_epoch:    3
```

Epoch 5 batch log'ları:
```
batch acc:     ~0.80–0.83
norm_edit_dis: ~0.95–0.96
loss:          ~3
ips:           190–235 samples/s
ETA:           ~2:20
```

**Yorum:** Sağlıklı run. Yeni dict/head katmanları toparlandı.

---

## A5000 / 4090 / 5090 Uyarıları

- **A5000 / 4090 (24 GB):** MultiHead batch 96 sınırda. Batch 32'ye düşürülebilir ama
  bu hız ve kaliteyi düşürür. Üretim eğitimi için önerilmez.
- **5090 (Blackwell sm_120+):** Paddle 2.x desteklemiyor. cuDNN hatası verir.
  Paddle 3.x + uyumlu CUDA gerektirir — henüz stabil değil.
- **Sonuç:** L40S 48 GB üretim standardı.

---

## %99+ Doğruluk Yol Haritası

1. **Mevcut v5 run'ını bekle** — epoch 30 sonucunu değerlendir
2. **Eğer acc > 96.0%** → production candidate, inference export et
3. **Eğer 95–96% arası** → `generate_v5.py`'ye eksik karakterler ekle (`q @  & ° ² = ? ! ;`), v6 dataset üret, hardcase fine-tune yap
4. **Eğer yeni char hatası varsa** → sadece o karakterler için 5k synthetic sample + fine-tune
