# AI Cost Strategy Plan (#154-A)

> **Status:** Agreed direction — docs only, no production switch yet.  
> **Trusted main:** `b942eab18` (#153 eval harness merged)  
> **Related:** [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md), [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md)

---

## Problem

Current production calls Anthropic/Claude (`decision_worker`) after every successful OCR result. OCR itself is local (Paddle). LLM cost scales linearly with document volume and is unnecessary when rule-based extraction is confident enough.

**#153-A** added an eval harness to compare parser baseline vs Gemini Flash vs Anthropic on saved OCR text fixtures. First synthetic run is informative but **not sufficient** to choose production defaults.

---

## Current production (unchanged)

```
Upload / scan
  → Paddle OCR (worker-ocr)
  → raw_text in document_texts
  → decision_worker
  → Anthropic/Claude explain()
  → document_meta (titel, typ, betrag, frist, …)
  → GET /result → frontend
```

- `LLM_PROVIDER` and `decision_worker` behavior are **not** changed by #153 or this plan doc.
- Gemini API key exists **locally only** (`.env`, not committed).

---

## Agreed strategy (target architecture)

### 1. Paddle OCR always

- Local/container OCR via Paddle.
- No external LLM token cost for text recognition.

### 2. Local parser always

- Rule-based extraction runs on every `raw_text`.
- No API/token cost.
- Extracts: `document_type`, amount/deadline candidates, sender/title candidates, risk hint, **confidence**, evidence fields.
- Implementation: `backend/app/services/local_document_parser.py` (#153).

### 3. Confidence gate

- If parser **operational confidence** is **high enough**, use parser result and **skip LLM**.
- Initial threshold band (post-#157 eval): HIGH ≥ **0.80**, MEDIUM **0.60–0.79**, LOW < **0.60** — see [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) (#163).
- **Final thresholds must be validated in shadow mode** (#164) on real traffic — not fixture-only.
- `title` / `summary` weakness must **not** alone block HIGH gate.

### 4. Cheap fallback (medium confidence)

- If parser operational confidence is **medium/uncertain** (initial band: `0.60 – 0.79`), optional cheap LLM enrichment — primarily UI fields.
- **Provider order is not finalized here.** See [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) — choice requires provider eval (`valid_json`, accuracy, cost, latency). Gemini Flash is candidate only, not default.

### 5. Reliable fallback (low confidence / complex)

- If parser operational confidence is **low** (`< 0.60`) or critical conflict flags fire, use targeted LLM fallback for unresolved operational fields.
- Reliable low-cost model tier (e.g. Claude Haiku-style) — **final choice via eval**, not assumed in this doc.

### 6. Premium / deep reasoning

- User-triggered or high-stakes flows use stronger models:
  - **Besser erkennen** (user asks for better recognition)
  - Reply drafts, objections, legal/official reasoning
  - Candidate: **Claude Sonnet** or other premium provider
- These are **explicit** cost events, not per-upload defaults.

### 7. Feedback loop

Fallback and correction data should improve the parser over time:

| Signal | Trust |
|--------|-------|
| User final saved/corrected document fields | **Highest** — ground truth for eval |
| Parser result | Baseline |
| LLM fallback result | Suggestion only — not ground truth |
| Raw OCR text | Input |

Store/compare `parser_result`, `fallback_result`, and final user-saved values. Use disagreement cases to:

- Add/update eval fixtures (`backend/tests/fixtures/extraction_eval/`)
- Evolve parser rules (`local_document_parser.py`)
- Re-run provider comparison before changing gates

### 8. Mistral & Claude Haiku (provider smoke, 2026-06-17)

Live smoke on 8 fixtures (5 redacted real OCR + 3 synthetic) — see [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md):

| Provider | avg_score | valid_json | Operational weakness |
|----------|-----------|------------|----------------------|
| Parser | **0.899** | 1.00 | Clean on operational fields |
| Mistral (`mistral-small-latest`) | 0.680 | 1.00 | amount, risk, sender, next_action failures |
| Claude Haiku (`claude-haiku-4-5-20251001`) | 0.695 | 1.00 | amount, risk, sender, next_action failures; better title/summary semantics |

**Provider smoke results strengthen parser-first strategy.** LLM fallback is **not justified** for HIGH parser confidence. Cost-saving strategy should prioritize **parser acceptance** and optional **title/summary semantic enrichment** rather than full LLM extraction.

- **Mistral:** eval-only integration **PASS** (#164 merged); production operational fallback **NO**.
- **Haiku:** title/summary enrichment **MAYBE**; production operational fallback **NO**.
- **Neither** should be selected as production operational fallback default.

### 9. Future infrastructure

- If volume/cost grows further, evaluate **local LLM / own inference** (Ollama, vLLM, etc.).
- **Not now** — harness and parser-first gate come first.

---

## First eval snapshot (#153, synthetic only)

3 synthetic German fixtures — **not production representative**:

| Provider | Avg score | valid_json | Notes |
|----------|-----------|------------|-------|
| **Parser** | **0.875** | 1.00 | Strong on type/amount/deadline; weak on some sender/title (e.g. Schornsteinfeger without GmbH suffix) |
| **Gemini Flash** | **0.750** | 1.00 | Valid JSON; better titles on some cases; weaker sender/risk vs expected in tiny set |

**Interpretation:** Parser baseline is stronger than Gemini on this micro-set for structured fields. Gemini is viable as JSON extractor but does not yet justify replacing parser or skipping Haiku for production. **No production switch.**

---

## Implementation phases (planned, not started)

| Phase | Scope | Status |
|-------|--------|--------|
| **#153-A** | Eval harness + local parser baseline | ✅ Merged (`b942eab18`) |
| **#154-A** | This strategy doc + canonical update | ✅ Docs |
| **#157** | Parser field improvements (amount → type/action) | ✅ Merged (#158–#162) |
| **#163** | Confidence gate design doc | ✅ Merged — [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) |
| **#164** | Mistral eval-only provider + provider smoke docs | ✅ Merged (`ef4597498`); operational fallback **NO** |
| **#164-B** | Shadow-mode instrumentation / gate logging | **NEXT** — after provider smoke docs |
| **#165+** | Parser-first gate in `decision_worker` (behind flag) | Planned — after shadow mode |
| Premium flows | Sonnet for Besser erkennen / drafts | Existing / separate |

---

## Decision gates before production switch

1. **≥ 20–30** anonymized real German OCR fixtures in eval set (invoices, Bescheide, Mahnungen, Versicherung, Behörde).
2. Parser-only path meets accuracy target on **user-corrected** labels (not LLM labels).
3. Cost model: parser skip rate × volume vs Gemini/Haiku fallback rates.
4. Feature flag for parser-first gate; shadow mode logs parser vs LLM diff before cutover.
5. No API keys or private documents in repo.

---

## How to run eval (reminder)

Parser-only (no keys):

```bash
cd backend
docker compose run --rm --no-deps api \
  python scripts/eval_extraction_providers.py --providers parser
```

With Gemini (local `.env` via Docker `env_file`):

```bash
cd backend
docker compose run --rm --no-deps api \
  python scripts/eval_extraction_providers.py --providers parser,gemini
```

See [EXTRACTION_PROVIDER_EVAL.md](EXTRACTION_PROVIDER_EVAL.md) for full usage.

---

## Out of scope (this plan doc)

- Changing `decision_worker` or `LLM_PROVIDER` defaults
- Mistral production routing (eval-only merged; fallback **NO**)
- Mobile / frontend changes
- OCR / Paddle runtime changes
- Committing secrets or full private documents
