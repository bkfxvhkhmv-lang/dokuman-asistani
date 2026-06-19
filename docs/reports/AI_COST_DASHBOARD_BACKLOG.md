# AI Cost Dashboard / LLM Spend Overview — Backlog

**Status:** Future — cost control / admin  
**Category:** Owner tooling, observability  
**Son güncelleme:** 2026-06-19  
**Bağımlılık:** `ai_usage_events` tablosu + `backend/scripts/ai_usage_report.py` (Phase 0 — mevcut)

---

## Problem

Owner şu an AI/LLM maliyetini görmek için ChatGPT’ye sormak veya manuel SQL çalıştırmak zorunda. Hedef: tek komut veya tek ekrandan **tahmini** maliyet, trend ve pahalı feature/model/belge görünürlüğü — Excel grafikleri veya sunum slaytları kalitesinde rapor.

---

## Goal

Owner, AI/LLM harcamasını **self-service** izleyebilsin:

- Bugün / dün / hafta / ay karşılaştırması
- Hangi feature, model, route pahalı?
- Hangi belgeler en çok token/cost yaktı?
- Başarısız çağrılar ve gecikme trendi
- Spreadsheet veya HTML ile paylaşılabilir çıktı

---

## Data source (read-only)

| Kaynak | Not |
|--------|-----|
| `ai_usage_events` | Skaler metrikler; doküman metni yok |
| `estimated_cost_usd` | **Tahmini** — her çıktıda “estimated” etiketi zorunlu |
| Mevcut CLI | `backend/scripts/ai_usage_report.py` (`--since today\|24h\|7d\|30d`) |

Referans: [AI_USAGE_REPORTING.md](AI_USAGE_REPORTING.md)

---

## 1. Time ranges

| Range | SQL / CLI alias |
|-------|-----------------|
| Today | `today` |
| Yesterday | `yesterday` |
| Last 7 days | `7d` |
| Current month | `month` / `mtd` |
| Last month | `last_month` |
| Year to date | `ytd` |
| Custom | `--from YYYY-MM-DD --to YYYY-MM-DD` |

---

## 2. KPIs (summary header)

| KPI | Kaynak alan | Not |
|-----|-------------|-----|
| Total calls | `count(*)` | |
| Total tokens | `sum(total_tokens)` | input/output ayrı alt satır |
| Estimated cost USD | `sum(estimated_cost_usd)` | null satırlar hariç veya ayrı göster |
| USD cents | `sum * 100` | spreadsheet-friendly |
| Avg cost per document | `sum(cost) / count(distinct document_id)` | null doc_id hariç |
| Avg tokens per call | `sum(tokens) / count(*)` | |
| Failed / success calls | `success = false` vs `true` | oran % |
| Latency avg | `avg(latency_ms)` | |
| Latency p95 | `percentile_cont(0.95)` | Postgres |

Tüm KPI bloklarında footer: *“Estimated costs based on MODEL_PRICING_PER_M; not an invoice.”*

---

## 3. Breakdowns (group-by dimensions)

| Dimension | SQL group | Kullanım |
|-----------|-----------|----------|
| Feature | `feature` | extraction, reply_draft, … |
| Route | `route` | decision_worker, ai_explain, … |
| Provider | `provider` | anthropic, openai |
| Model | `model` | tam model id |
| Document | `document_id` | top-N pahalı; **id only, no title/text** |
| Hour of day | `extract(hour from created_at)` | heatmap |
| Weekday | `extract(dow from created_at)` | bar |
| Day trend | `date(created_at)` | line chart |
| Month trend | `date_trunc('month', …)` | line chart |

---

## 4. Charts (visual outputs)

| Chart | Type | Data |
|-------|------|------|
| Daily cost trend | Line | `date` × `sum(estimated_cost_usd)` |
| Hourly distribution | Bar or heatmap | hour × cost or call count |
| Cost by feature | Horizontal bar | feature × cost |
| Model / provider split | Stacked bar or donut | provider/model × cost |
| Top 10 expensive documents | Bar table | document_id × cost (no PII) |
| Token usage trend | Line | date × sum(total_tokens) |
| Success vs error trend | Stacked area | date × success/fail count |

Phase 2+: HTML dashboard (Chart.js / veya static SVG). Phase 1: ASCII tables in terminal yeterli.

---

## 5. Outputs (delivery channels)

| Output | Phase | Açıklama |
|--------|-------|----------|
| **CLI report** | 1 | Tek komut → terminal özeti + breakdown tabloları |
| **HTML report** | 2 | `--format html` → tarayıcıda grafikli sayfa |
| **CSV export** | 3 | `--export csv` → Excel’de pivot/grafik |
| **In-app admin** | 4 | Owner-only screen (mobile veya web admin) |
| **Alert thresholds** | 5 | Günlük cost > X → log / email / webhook |

---

## 6. Implementation phases

### Phase 0 — Done (baseline)

- `ai_usage_events` migration + instrumentation
- `ai_usage_report.py` — today / 24h / 7d / 30d özet
- Dokümantasyon: `AI_USAGE_REPORTING.md`

### Phase 1 — Local script / Postgres report

- Genişletilmiş CLI: tüm time range’ler + custom `--from`/`--to`
- KPI header + breakdown tabloları (feature, route, provider, model, top docs)
- Read-only SQL; Docker `exec api python scripts/…`
- **Acceptance:** `python scripts/ai_usage_report.py --since 7d` → KPI + top 5 feature + top 5 model

### Phase 2 — Generated HTML dashboard

- `--format html --output /tmp/ai_cost_report.html`
- Embedded charts (daily line, feature bar, model split)
- Self-contained single file; no CDN secrets
- **Acceptance:** HTML açılınca grafikler render; “estimated” disclaimer görünür

### Phase 3 — CSV export

- `--export csv --breakdown feature,model,day`
- Excel-friendly columns: date, feature, route, provider, model, calls, tokens, cost_usd, cost_cents
- **Acceptance:** Excel’de pivot + line chart oluşturulabilir

### Phase 4 — In-app admin page

- Owner/admin only (auth gate)
- Aynı KPI + chart’lar mobile veya internal web
- Pull from backend read API (not direct DB from client)
- **Acceptance:** Owner login → Cost overview without SQL

### Phase 5 — Alerts & budgets

- Config: `DAILY_COST_ALERT_USD`, `MONTHLY_BUDGET_USD`
- Cron veya worker: threshold aşımında notification
- **Acceptance:** Test threshold → tek alert event; no spam

---

## 7. Safety & privacy

| Rule | Detail |
|------|--------|
| Read-only | SELECT only; no INSERT/UPDATE on prod from report tool |
| No document text | Export’ta `document_id` UUID; title, OCR, prompt, response yok |
| No secrets | API keys, JWT, `.env` içeriği export’ta yok |
| Owner/admin only | CLI local OK; in-app Phase 4’te role gate |
| Estimated label | Her KPI/chart/export’ta “estimated cost” disclaimer |
| PII | `user_id` aggregate only; export’ta ham user listesi opsiyonel/kapalı |

---

## 8. Acceptance criteria (release gate)

- [ ] **One command overview:** `ai_usage_report.py --since today` (veya `7d`) → KPI + en az 2 breakdown
- [ ] **Trend visible:** günlük cost line veya tablo ile artış/azalış görülür
- [ ] **Expensive identification:** top feature, model, document_id listelenir
- [ ] **Period compare:** today vs 7d vs month yan yana veya `--compare` flag
- [ ] **Spreadsheet export:** CSV ile Excel incelemesi mümkün (Phase 3+)
- [ ] **No manual SQL required** for routine owner review
- [ ] **Tests:** unit tests for date parsing, aggregation SQL, CSV shape; no live API keys in tests

---

## 9. Out of scope (this feature)

- Gerçek fatura / provider billing API entegrasyonu
- Kullanıcı başına faturalandırma (billing product)
- Doküman içeriği veya prompt logging
- Otomatik model routing değişikliği (sadece rapor; aksiyon ayrı karar)

---

## 10. Suggested PR sequence

| PR | Scope |
|----|--------|
| **PR A** | Phase 1 — CLI genişletme (ranges, KPIs, breakdowns) |
| **PR B** | Phase 2 — HTML report generator |
| **PR C** | Phase 3 — CSV export |
| **PR D** | Phase 4 — admin API + owner screen |
| **PR E** | Phase 5 — alerts |

Karıştırma: HTML + in-app aynı PR’de olmaz. CLI stabil olmadan in-app yok.

---

## 11. Related files (future touch)

| File | Role |
|------|------|
| `backend/scripts/ai_usage_report.py` | Phase 1–3 CLI |
| `backend/app/models/ai_usage.py` | Schema reference |
| `backend/app/services/llm_usage.py` | Pricing / persist |
| `docs/reports/AI_USAGE_REPORTING.md` | Ops runbook |
| `backend/tests/test_ai_usage_telemetry.py` | Extend for report tests |

---

## 12. Open questions (decide before Phase 4)

- Admin UI: mobile Einstellungen mi, ayrı web panel mi?
- `user_id` breakdown: owner-only aggregate mi, tamamen kapalı mı?
- Timezone: UTC mi, Europe/Berlin mi (owner local)?

---

**Backlog index:** [CURRENT_BACKLOG.md](CURRENT_BACKLOG.md) §11
