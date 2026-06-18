# German OCR Extraction Provider Eval (#153-A)

## Why this exists

BriefPilot runs Paddle OCR on every document, then calls an LLM (`decision_worker` → Anthropic/OpenAI) to produce `document_meta`. Calling Claude for every scan is too expensive at scale.

Target architecture (not implemented yet):

| Parser confidence | Policy |
|-------------------|--------|
| ≥ 0.75 | Use local parser only — no LLM |
| 0.40 – 0.75 | Cheap LLM fallback (e.g. Gemini Flash) |
| < 0.40 or complex | Claude Haiku / reliable fallback |
| Besser erkennen, legal reply, objection | Claude Sonnet / premium |

**This slice is eval harness only.** Production `decision_worker` and `LLM_PROVIDER` are unchanged.

## First-run results (synthetic fixtures, 2026-06-17)

3 test-safe German OCR text fixtures in `backend/tests/fixtures/extraction_eval/`:

| Provider | Avg score | valid_json | avg latency |
|----------|-----------|------------|-------------|
| **Parser** (local rules) | **0.875** | 1.00 | ~0 ms |
| **Gemini Flash** (`gemini-2.0-flash`) | **0.750** | 1.00 | ~2.5–4.2 s |

### Interpretation

- **Parser baseline is strong** on structured fields in this tiny set: `document_type`, amount, deadline score well on Heizöl invoice and Mahnung.
- **Parser gaps:** sender/title on Schornsteinfeger fixture (no `GmbH`/`AG` suffix on sender line) — expected baseline limitation.
- **Gemini Flash:** returns valid JSON consistently; title extraction sometimes better; **sender and risk weaker** vs expected labels in this micro-set (e.g. risk `niedrig`/`mittel` vs expected `hoch` on Mahnung).
- **Not enough to choose production defaults.** Need anonymized real OCR fixtures and user-corrected ground truth before parser-first gate or Gemini default fallback.

Full strategy: [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md).

## Fixture format

Path: `backend/tests/fixtures/extraction_eval/*.json`

Each file:

```json
{
  "id": "unique_id",
  "label": "Human label",
  "raw_text": "German OCR text…",
  "expected": {
    "document_type": "Rechnung",
    "title_keywords": ["Heizöl"],
    "sender_keywords": ["Alt GmbH"],
    "amount": 1929.2,
    "deadline": "2026-07-15",
    "risk": "mittel",
    "summary_keywords": ["Rechnung"],
    "next_action": "zahlen"
  }
}
```

Use synthetic or anonymized text only. Do not commit private full documents or API keys.

## Parser-only eval (no network, no keys)

From repo root:

```bash
cd backend
python scripts/eval_extraction_providers.py --providers parser
```

Or with pytest:

```bash
cd backend && python -m pytest tests/test_local_document_parser.py tests/test_eval_extraction_scorer.py tests/test_eval_extraction_providers.py -q
```

## Gemini / Anthropic eval (local, keys required)

Set environment variables in your shell (never commit them):

```bash
export GEMINI_API_KEY=...
export GEMINI_MODEL=gemini-2.0-flash   # optional; default Flash model

export ANTHROPIC_API_KEY=...
export ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # optional; uses app settings if set
```

Run:

```bash
cd backend
python scripts/eval_extraction_providers.py --providers parser,gemini,anthropic
python scripts/eval_extraction_providers.py --providers gemini --json-out /tmp/eval.json
```

Missing keys: provider is **skipped** with a clear message (no hard failure unless that is the only provider and all rows skip).

**Docker note:** `api` service uses `env_file: .env` in `docker-compose.yml`, so `docker compose run api …` injects `GEMINI_API_KEY` from local `.env` without manual `-e`. The harness reads `os.environ` only — it does not load `.env` on the host shell.

## Scoring

Per fixture × provider:

- `document_type` — exact / alias-normalized
- `amount` — numeric tolerance (±0.02)
- `deadline` — ISO or `DD.MM.YYYY` normalized
- `title` / `sender` — keyword overlap
- `risk` — exact match
- `summary` — keyword overlap
- `next_action` — first `aktionen` entry

Output includes `valid_json`, `latency_ms`, `estimated_cost` (token hint for Gemini when available, else `unknown`).

## Components

| Module | Role |
|--------|------|
| `app/services/local_document_parser.py` | Rule-based baseline extractor |
| `app/services/eval_extraction_scorer.py` | Field scoring |
| `app/services/eval_extraction_providers.py` | Provider registry (parser / gemini / anthropic) |
| `app/services/gemini_eval.py` | Isolated Gemini Flash JSON client |
| `scripts/eval_extraction_providers.py` | CLI harness |

## Privacy

- No secrets in the repo.
- Fixtures must be test-safe synthetic OCR text unless explicitly approved.
- Eval scripts log extracted fields, never API keys.

## Decision gate

Do **not** switch production to parser-first until real fixtures (including anonymized production samples run locally) show acceptable accuracy and cost trade-offs from this harness.

See [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md) for the agreed confidence-gate policy and implementation phases.

## Out of scope (#153-A)

- Production parser-first gate in `decision_worker`
- Mistral provider
- Mobile / frontend changes
- OCR / Paddle runtime changes
- `summary_worker` vector bug
