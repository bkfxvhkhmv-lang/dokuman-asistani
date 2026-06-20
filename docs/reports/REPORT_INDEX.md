# BriefPilot Report Index

Tüm proje raporları bu indeksten erişilebilir.

---

## Canonical Context (ZORUNLU — her görev öncesi)

📄 [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md)

**Kapsam:** Trusted main, PR preamble (5 madde), Camera/Scanner/Polygon preservation rule, #147 migration durumu, Pixel OCR working dev config (#146-C3), AI cost strategy (#154-A).

---

## 2026-06-19 Product Roadmap — Quiet Document Workflow

📄 [ASSISTANT_FIRST_ROADMAP.md](ASSISTANT_FIRST_ROADMAP.md) — BriefPilot product roadmap (revised: quiet workflow, not banners)

**Kapsam:** Ürün yönü — quiet workflow (banner yok). **Canonical backlog §1–9:** isDirty → Date/Betrag → **Detail card limit + accordion actions** → Settings → Classification → Invoice export → NK → Calendar → SEPA. Backlog adı ≠ GitHub PR #.

📄 [ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md](ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md) — #189 Absender extraction/display audit

**Kapsam:** Screen-rec trust failures (Finanzamt-on-invoice, Wasserwerk title vs Fehlt, Sonstiges cluster). Data-flow diagram; confirmed root causes; risk ranking; recommended #189a display fallback PR + #189b save-path follow-up. Audit-only — no code.

---

## 2026-06-18 AI Usage Reporting — CLI + Persistent Telemetry

📄 [AI_USAGE_REPORTING.md](AI_USAGE_REPORTING.md) — `ai_usage_events` tablo şeması; CLI rapor komutları; PII guard; smoke sonucu; operasyonel kararlar

**Kapsam:** `ai_usage_events` DB tablosu (migration 0003), `persist_usage_event`, `scripts/ai_usage_report.py` CLI. Telemetri PASS; dashboard/cron LATER.

📄 [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md) — Future AI Cost Dashboard / LLM Spend Overview (phases 1–5, KPIs, charts, safety, acceptance)

---

## 2026-06-18 LLM Extraction Usage Telemetry

📄 [LLM_USAGE_TELEMETRY.md](LLM_USAGE_TELEMETRY.md) — `llm.usage` event; routes `decision_worker` / `ai_explain`; double-call analysis

**Kapsam:** Scalar token/cost logs per extraction `explain()` call. Upload pipeline = 1 LLM call; `/ai/explain` cached when meta exists.

---

## 2026-06-18 Shadow-Mode Local Smoke (#166)

📄 [SHADOW_MODE_SMOKE_2026-06-18.md](SHADOW_MODE_SMOKE_2026-06-18.md) — 15 local shadow logs; OCR + gate distribution; routing HOLD  
📄 [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) — observe-only spec  
📄 [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md) — trusted main `b29af0334`

**Kapsam:** Docs only. 15 `extraction.shadow_compare` events; `applied_source=current_production_llm` 15/15; parser gate HIGH 1 / MEDIUM 3 / LOW 11. Parser-first routing **HOLD**. Summary worker pgvector bug noted as **NEXT** separate PR.

---

## 2026-06-18 Extraction Shadow-Mode Instrumentation (#164-B / #166)

📄 [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) — #164-B observe-only shadow log spec  
📄 [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md) — `EXTRACTION_SHADOW_MODE`, applied_source `current_production_llm`

**Kapsam:** `decision_worker` shadow hook; flag default off. Parser log-only; `document_meta` still LLM. No DB, no routing switch, no operational override.

---

## 2026-06-17 Provider Smoke Results — Parser vs Mistral vs Haiku

📄 [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md) — provider smoke table (parser 0.899 vs Mistral 0.680 vs Haiku 0.695)  
📄 [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) — operational source of truth; LLM override **NO**; shadow candidates  
📄 [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md) — smoke strengthens parser-first; LLM fallback not justified for HIGH  
📄 [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md) — trusted main `ef4597498`, #164 merged, shadow-mode **NEXT**

**Kapsam:** Docs only. Parser operational source of truth **GO**; LLM title/summary enrichment **MAYBE**; LLM operational override **NO**; production routing **HOLD**; shadow-mode instrumentation **NEXT**. No production default provider selected.

---

## 2026-06-17 Parser Confidence Gate Design (#163)

📄 [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) — HIGH/MEDIUM/LOW states, operational confidence, safe-null, shadow mode, rollout  
📄 [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md) — cross-links updated  
📄 [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md) — trusted main `ef4597498`, #157 arc summary

**Kapsam:** Docs only — no `decision_worker` / parser code. Provider order eval-driven; Gemini not default. #164-B = shadow instrumentation (next).

---

## 2026-06-17 AI Cost Strategy (#154-A)

📄 [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md) — parser-first gate, Gemini/Haiku fallback tiers, feedback loop, Mistral deferred  
📄 [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md) — #153 eval harness + first synthetic run results  
📄 [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md) — “AI cost strategy” özet bölümü

**Kapsam:** Docs only — no production `decision_worker` change. Parser avg 0.875 vs Gemini Flash 0.750 on 3 synthetic fixtures; insufficient for prod default choice.

---

## 2026-06-17 Extraction Eval Harness (#153-A)

📄 [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md)

**Kapsam:** Backend eval tooling — `local_document_parser`, `eval_extraction_providers.py`, synthetic fixtures. Merged `b942eab18`. Production behavior unchanged.

---

## 2026-06-17 OCR Runtime Config (#146-C3)

📄 [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md) — “Runtime OCR / Paddle” ve “Pixel OCR working local dev config” bölümleri
📄 [backend/.env.example](../../backend/.env.example) — OCR dev smoke yorumları ve önerilen değerler

**Kapsam:** Docs/config only — `PROCESS_OCR_INLINE_DEV=false`, PP-OCRv4+`en`, v5/de OOM uyarısı. Kod/runtime logic yok. `backend/.env` commit edilmez.

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

### #138 Merge Report

📄 [docs/audits/2026-06-17_138-analysieren-migration-MERGE-report.md](../audits/2026-06-17_138-analysieren-migration-MERGE-report.md)

**Kapsam:** #138 PR’nin `main`e squash merge sonrası doğrulama raporu.

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
