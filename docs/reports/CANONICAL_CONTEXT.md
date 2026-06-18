# BriefPilot — Canonical Context

> **Son güncelleme:** 2026-06-17  
> **Trusted main:** `37f8a99e8`  
> **Son merge:** PR #162 — `fix(parser): refine document type and next action`  
> **Repo:** `/Users/bayramgul/briefpilot-clean`  
> **Stash count:** 6 — dokunma (kullanıcı söylemedikçe)

Bu dosya tüm PR / audit / Cursor görevleri için zorunlu bağlam kaynağıdır.  
Eski context dosyalarındaki farklı HEAD değerleri bu dosyayı geçersiz kılar.

---

## Kısa karar (2026-06-17)

| İş | Durum |
|----|--------|
| **#147-A** (Kamera routing → core API) | **DONE** |
| **#146-C1** (inline=false worker path smoke) | **DONE** (local config) |
| **#146-C2** (PP-OCRv4 + lang smoke) | **DONE** (local config) |
| **Pixel OCR** | **WORKING** (local dev config ile) |
| **Kalan ana iş** | AI extraction/enrichment boş alanlar + config/docs PR |
| **#147-B** (health bootstrap) | Bekliyor — kullanıcı engeli değil, #146-C sonrası |
| **#153-A** (extraction eval harness) | **DONE** — merged `b942eab18` |
| **#157 arc** (parser fields A–F) | **DONE** — #158–#162; parser avg **0.899**, operational fields 0/8 fail |
| **#163** (confidence gate design) | **Docs** — [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) |
| **AI cost strategy** | **Planlandı** — [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md); production switch yok |

---

## AI cost strategy (özet — #154-A)

Uzun vadede her OCR sonucu için Claude çağırmayacağız. Hedef:

1. **Paddle OCR** her zaman (local, token maliyeti yok).
2. **Local parser** her zaman (`local_document_parser.py` — rule-based, confidence + evidence).
3. **Confidence gate:** operational confidence HIGH ≥ **0.80** → parser sonucu, LLM atla — detay: [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) (#163). Shadow mode (#164) zorunlu; production switch yok.
4. **Orta güven (0.60–0.79):** parser göster; opsiyonel async enrichment (title/summary). LLM provider sırası **eval ile belirlenecek** — Gemini default değil.
5. **Düşük güven (< 0.60 / conflict):** targeted LLM fallback — güvenilir düşük maliyetli model adayı (eval ile seçim).
6. **Premium:** Besser erkennen, cevap taslağı, itiraz, hukuki ağır akışlar → Claude Sonnet / premium.
7. **Feedback loop:** parser vs fallback vs kullanıcının kaydettiği/düzelttiği alanlar; en güvenilir sinyal kullanıcı final verisi.
8. **Mistral:** opsiyonel gelecek eval adayı; default değil.

Parser eval (#157 sonrası, 8 fixture): avg **0.899**, operational fields **0/8** fail, `valid_json` 1.00, ~0.7 ms. Detay: [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md), [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md), [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md).

**Production `decision_worker` / `LLM_PROVIDER` değişmedi.**

---

## Her görev öncesi zorunlu preamble (5 madde)

1. **TRUSTED MAIN** — `git rev-parse --short HEAD` ile doğrulanmış commit
2. **Proje hikâyesindeki yer** — Bu dilim önceki merge'lerle nasıl bağlanıyor?
3. **Dokunulmayacak tarihsel alanlar** — Preservation rule dahil
4. **Sadece bu dilimde yapılacaklar** — Net scope
5. **Scope dışı** — Tekrar listelenir

---

## Camera / Scanner / Polygon preservation rule (ZORUNLU)

Projede daha önce **custom camera + scanner + polygon/cropper** sistemi denendi.  
Küçük pürüzler nedeniyle **ertelendi**, ancak **bilinçli olarak saklandı**.  
İleride tekrar devreye alınabilir. **Cleanup / refactor / silme yok.**

### Kesin yasak

- Native camera / scanner / polygon / cropper dosyaları
- iOS / Android native config, permissions, camera module setup
- `ExpoScannerProvider`, `persistScanFiles`, capture/crop/file persist davranışı
- Kullanılmıyor görünen scanner/polygon dosyalarını silme

### OCR migration kapsamı

| Eski | Yeni |
|------|------|
| OCR MVP `POST /documents/analyze` | Core API `POST /api/v4/documents/` + poll + `GET …/result` |

---

## Tamamlanan işler (main @ `01a89452d`)

### #145 — PDF text-layer threshold (merged)

- `_TEXT_LAYER_MIN_CHARS`: 50 → **200**
- `_TEXT_LAYER_MIN_TOKENS`: 5 → **20**
- Kısa/bozuk embedded text layer artık meaningful sayılmıyor; Paddle fallback'e düşüyor
- `tests/test_ocr.py` PASS

### #146-A — upload dev-mode test fixture (merged)

- `test_upload_dev_mode` → `PROCESS_OCR_INLINE_DEV=true` ortamına uyumlu
- **Runtime fix değil**, test fixture fix
- `backend/tests/test_documents.py` PASS

### #147-A1 — core scan job altyapısı (merged, PR #147)

- `src/hooks/useCoreScanJob.ts`
- `src/features/ocr-mvp/adapters/workerResultToOcrMvpStatus.ts`
- Unit testler

### #147-A2 / PR #148 — Kamera tab routing fix (merged)

| Eski | Yeni |
|------|------|
| `OcrMvpScreen` → `useOcrMvpJob` → `POST /documents/analyze` → **405** | `OcrMvpScreen` → `useCoreScanJob` → `POST /api/v4/documents/` → poll/result |

**Pixel Kamera routing PASS.** `/documents/analyze` Kamera flow'dan çıktı.

---

## Pixel OCR — çalışan zincir (doğrulandı)

```
Pixel Kamera
  → POST /api/v4/documents/ (201)
  → Celery worker-ocr
  → Paddle OCR
  → GET /api/v4/documents/{id}/result (200, completed)
  → raw_text dolu
```

### Son doğrulanan Pixel OCR

| Alan | Değer |
|------|--------|
| DOC_ID | `00aa609c-a929-4fae-937b-c9197ee68736` |
| Dosya | `Heizöl-3.pdf` |
| Upload | `POST /api/v4/documents/` → **201** |
| Result | `GET …/result` → **200**, `status: completed` |
| Confidence | **0.9043** |
| Language | `de` |
| Provider | `paddle_worker` |
| raw_text | **dolu** |

---

## Runtime OCR / Paddle — kök neden ve çözüm (local dev)

### Eski bozuk durum

```
PROCESS_OCR_INLINE_DEV=true
OCR_PIPELINE_VERSION=PP-OCRv5
OCR_LANG=de
```

**Sorunlar:**
- Upload OCR bitene kadar bekliyordu → client **503**
- `Wasser 30.pdf` → inline/worker **SIGKILL (-9)** OOM
- Pixel'de analiz 503 veya "Fast fertig"te kalma hissi

### #146-C1 sonucu (local smoke, commit yok)

`PROCESS_OCR_INLINE_DEV=false` (+ `docker compose up -d --force-recreate api worker-ocr`)

- Upload **503'ten ayrıldı** → **201 + pending**
- `worker-ocr` task almaya başladı
- **Not:** `docker compose restart` env'i yenilemez; `--force-recreate` gerekir

### #146-C2 sonucu (local smoke, commit yok)

PP-OCR dil / pipeline matrisi:

| Config | Sonuç |
|--------|--------|
| PP-OCRv4 + `de` | FAIL |
| PP-OCRv4 + `latin` | FAIL |
| PP-OCRv4 + `en` | **OK** |
| PP-OCRv5 + `de` | OK ama büyük PDF'de SIGKILL/OOM |
| PP-OCRv5 + `latin` | FAIL |
| PP-OCRv5 + `en` | OK |

### Pixel OCR working local dev config (gitignored `backend/.env`)

```env
PROCESS_OCR_INLINE_DEV=false
OCR_PIPELINE_VERSION=PP-OCRv4
OCR_LANG=en
OCR_MAX_IMAGE_SIDE=2048
ENVIRONMENT=development
```

Bu config ile doğrulandı:

| Dosya | Sonuç |
|-------|--------|
| `Wasser 30.pdf` | completed, chars=1673, confidence=0.9649 |
| `Heizöl-3.pdf` | completed, confidence=0.9043, language=de, raw_text dolu |

**Uyarı:** `OCR_LANG=en` ile Paddle çalışıyor; Almanca belgelerde dil alanı `de` görülse bile bu dev workaround. Prod kararı ayrı.

---

## Kök neden özeti

| Sorun | Sebep | Durum |
|-------|--------|--------|
| Eski **405** | Kamera tab OCR MVP endpoint | **Çözüldü** — #147-A / PR #148 |
| Eski **503** (upload) | `PROCESS_OCR_INLINE_DEV=true` inline OCR | **Çözüldü** — local `inline=false` |
| Worker **SIGKILL** | PP-OCRv5 + `OCR_LANG=de` + büyük taralı PDF OOM | **Çözüldü** — local PP-OCRv4 + `en` |
| AI alanları boş | OCR tamam, enrichment/labeler bağlı değil veya çalışmıyor | **Açık** — yeni audit |

---

## Şu an kalan problem

OCR **completed** + `raw_text` dolu. AI enrichment (#150) çalışıyor ancak:

- Her belge için Claude çağrısı **maliyetli** — parser-first gate henüz yok.
- Eval seti çok küçük (3 sentetik fixture) — gerçek anonymized OCR fixture toplama sırada.
- Frontend title/list (#152) ayrı PR bekliyor olabilir.

**Ayrım:**

> OCR tamam. Sıradaki optimizasyon: parser confidence gate + ucuz fallback (Gemini) + güvenilir fallback (Haiku) — önce eval, sonra prod.

---

## Sonraki teknik sıra

1. ~~Canonical context güncelle~~ (bu dosya)
2. ~~**#153-A eval harness**~~ — merged `b942eab18`
3. **#154-A AI cost strategy docs** — plan + canonical (bu dilim)
4. **#154-B+** — gerçek anonymized OCR eval fixture toplama
5. Parser-first gate (`decision_worker`, feature flag) — eval sonrası
6. Pixel'de 2–3 gerçek Alman belgeyle PP-OCRv4/en kalite smoke
7. **#147-B** — health bootstrap (yanıltıcı "online")
8. Frontend #152 title + Zuletzt erfasst ordering — ayrı PR

---

## PR dilimleri (güncel)

| Dilim | Durum | Not |
|-------|-------|-----|
| #145 text-layer threshold | ✅ Merged | |
| #146-A test fixture | ✅ Merged | |
| #147-A1 core scan hook | ✅ Merged PR #147 | |
| #147-A2 OcrMvpScreen wire | ✅ Merged PR #148 | |
| #146-C1 worker path smoke | ✅ Local smoke | commit yok |
| #146-C2 PP-OCRv4/lang smoke | ✅ Local smoke | commit yok |
| **#146-C3 config/docs** | ✅ | `.env.example` + docs |
| **#153-A extraction eval harness** | ✅ Merged `b942eab18` | parser + Gemini + Anthropic eval CLI |
| **#154-A AI cost strategy docs** | **Bu dilim** | plan doc; kod yok |
| Real OCR eval fixtures | Bekliyor | anonymized production samples |
| Parser-first production gate | Bekliyor | eval sonrası |
| #147-B health bootstrap | Bekliyor | |

---

## Servis adlandırması

| Servis | Rol |
|--------|-----|
| `briefpilot-core-api` | `backend/` — Docker, `POST /api/v4/documents/`, Paddle, PostgreSQL |
| `briefpilot-ocr-api` | Legacy OCR MVP — `POST /documents/analyze` (Kamera artık kullanmıyor) |
| `briefpilot-mobile` | React Native / Expo — repo root |

---

## Son merge'ler (HEAD `01a89452d`)

```
01a89452d fix(ocr): route camera analysis through core scan job (#148)
e967a5d1b feat(ocr): add core scan job hook (#147)
2e803aad6 test(backend): mock inline OCR in upload dev mode test (#146)
b3e1b3770 fix(backend): raise PDF text-layer fast-path threshold to 200/20 (#145)
…
2f175a051 feat(detail): migrate Analysieren to core-api backend (#138)
```

---

## İlk komutlar

```bash
cd /Users/bayramgul/briefpilot-clean
git branch --show-current
git rev-parse --short HEAD
git log -5 --oneline
git status --short
git stash list | wc -l
```

## Devam kuralı

- HEAD trusted main ile uyuşmuyorsa veya scope dışı dosya değişmişse dur, raporla.
- Preservation rule ihlali görülürse dur.
- Local `backend/.env` runtime ayarları commit edilmez; canonical'da "working local config" olarak belgelenir.

---

## İlgili dosyalar

- [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md) — parser-first + fallback stratejisi (#154-A)
- [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) — confidence gate HIGH/MEDIUM/LOW (#163)
- [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md) — eval harness kullanımı (#153)
- `docs/reports/BriefPilot_Yapilacaklar_ve_Kararlar.md` — kararlar özeti
- `docs/reports/BRIEFPILOT_CONTEXT_CLAUDE.md` — mirror (bu dosyaya bak)
- `docs/reports/BRIEFPILOT_CONTEXT_KIMI.md` — mirror (bu dosyaya bak)
