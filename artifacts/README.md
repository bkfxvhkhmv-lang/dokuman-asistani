# BriefPilot Artifact Registry

Binary artifact'lar Git'e commit edilmez. Bu dosya dışsal artifact'ların
kaydını tutar. Checksums `checksums.sha256` dosyasında bulunur.

## Kural

| Tür | Git | Nerede |
|---|---|---|
| Kaynak kod, config, script | ✅ commit | Git |
| Dataset tar.gz | ❌ | Lokal disk / RunPod |
| Model checkpoint | ❌ | Lokal disk / RunPod |
| Training log | ❌ | RunPod |
| Checksum + manifest | ✅ commit | `artifacts/checksums.sha256` |

---

## Kayıtlı Artifact'lar

### v6_comprehensive_80k.tar.gz

| Alan | Değer |
|---|---|
| Tür | OCR recognition dataset |
| Boyut | ~1.0 GB |
| SHA256 | `58ecc207406f51efd69572006ccbe64f72c23f5f17e9125fa97f136ac0c5980f` |
| Lokal path | `~/Desktop/BRIEFPILOT_OCR_DATASETS/v6_comprehensive_80k.tar.gz` |
| RunPod hedef | `/workspace/v6_comprehensive_80k.tar.gz` |
| Git durumu | NOT committed — external artifact |
| Amaç | V5 max_text_length/char coverage/degraded scan eksikliklerini giderir |
| Manifest | `docs/datasets/v6_DATASET_MANIFEST.md` |

---

### ppocrv4_w480_splitaddr_v4_pct9521_BEST.tar.gz

| Alan | Değer |
|---|---|
| Tür | OCR model checkpoint |
| Boyut | 167 MB |
| Lokal path | `~/Downloads/OCR_MODEL_INVENTORY/modeller/aktif/` |
| Acc | 95.21% |
| Git durumu | NOT committed |
| Model kaydı | `docs/models/OCR_MODEL_REGISTRY.md` |

---

## Upload Prosedürü (RunPod)

```bash
# Jupyter Lab / port 8888 üzerinden dosyayı /workspace/'e sürükle
# Sonra SHA256 doğrula:
python3 -c "
import hashlib
from pathlib import Path
h = hashlib.sha256()
p = Path('/workspace/v6_comprehensive_80k.tar.gz')
[h.update(c) for c in iter(lambda: p.open('rb').read(1024*1024), b'')]
print(h.hexdigest())
"
```
