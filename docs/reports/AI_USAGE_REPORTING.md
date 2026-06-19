# AI Usage Reporting

> **Son güncelleme:** 2026-06-18
> **Branch:** `fix/summary-worker-pgvector-bind`
> **Son commit:** `b792e730a` — `feat(scripts): add AI usage cost report CLI`

---

## A) Was wird erfasst (takip edilen alanlar)

### Tabelle `ai_usage_events`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | String (UUID) | Zeilen-PK — auto-generiert |
| `created_at` | timestamptz | UTC-Zeitstempel des API-Aufrufs |
| `feature` | String | Logischer Verwendungsbereich (`extraction`, zukünftig mehr) |
| `route` | String | Technische Route (`decision_worker`, `ai_explain`) |
| `provider` | String | LLM-Anbieter (`anthropic`, `openai`) |
| `model` | String | Exakte Modell-ID (`claude-haiku-4-5-20251001`, `gpt-4o-mini`, …) |
| `document_id` | String (UUID) | Referenz zum Dokument — kein Inhalt, kein Dateiname |
| `user_id` | String | Nutzer-Referenz — kein PII-Inhalt |
| `input_tokens` | Integer | Eingabe-Tokens laut Provider-Metadaten |
| `output_tokens` | Integer | Ausgabe-Tokens laut Provider-Metadaten |
| `total_tokens` | Integer | Summe oder Provider-Gesamtwert |
| `cache_creation_input_tokens` | Integer | Anthropic prompt-cache: Write-Tokens (null wenn nicht zutreffend) |
| `cache_read_input_tokens` | Integer | Anthropic prompt-cache: Read-Tokens (null wenn nicht zutreffend) |
| `estimated_cost_usd` | Numeric(18,8) | Kostenschätzung aus `MODEL_PRICING_PER_M`; `null` bei unbekanntem Modell |
| `latency_ms` | Numeric(10,2) | Wandzeit des Provider-API-Aufrufs |
| `success` | Boolean | `true` = normaler Abschluss; `false` = Fehler |
| `error_type` | String | Exception-Klassenname bei Fehler, sonst null |

### Preistabelle (exakte Modell-ID erforderlich)

| Modell | Input $/1M | Output $/1M |
|--------|-----------|------------|
| `claude-haiku-4-5-20251001` | 1.00 | 5.00 |
| `gpt-4o-mini` | 0.15 | 0.60 |

Anthropic-Cache-Preisfaktoren: `cache_creation` = 1,25× Input; `cache_read` = 0,10× Input.

Unbekannte Modelle: Tokens werden protokolliert, `estimated_cost_usd=null` (keine Schätzung).

---

## B) Was wird NICHT erfasst (PII / Datenschutz)

Die folgenden Informationen werden weder in der Tabelle noch in Logs gespeichert:

- Roher OCR-Text / gescannte Dokumentinhalte
- LLM-Prompts
- Vollständige LLM-Antworten
- Namen von Absendern
- IBAN-Nummern
- Adressen
- API-Schlüssel oder Secrets
- Dateinamen

**Grundsatz:** `ai_usage_events` enthält ausschließlich skalare Betriebskennzahlen — keine Inhalts- oder Identifikationsdaten.

---

## C) Unterstützte Feature/Route-Kombinationen (Stand 2026-06-18)

| feature | route | Auslöser |
|---------|-------|---------|
| `extraction` | `decision_worker` | Celery-Task nach OCR — primärer Upload/Analyse-Pfad |
| `extraction` | `ai_explain` | `POST /api/v4/ai/explain/{doc_id}` wenn kein gecachtes Meta vorhanden |

### Wann erfolgen zwei LLM-Aufrufe?

| Szenario | LLM-Aufrufe |
|----------|-------------|
| Normaler Upload; Client pollt nur Worker-Ergebnis | **1** (`decision_worker`) |
| Client ruft `/ai/explain` auf, nachdem Meta gecacht ist | **0** zusätzlich |
| Client ruft `/ai/explain` auf, bevor `decision_worker` fertig ist | **bis zu 2** |

---

## D) Zukünftige Routen (schema-bereit, Implementierung später)

| feature | route | Status |
|---------|-------|--------|
| `reply_draft` | `reply_assistant` | Schema bereit, Implementierung LATER |
| `summarization` | `title_summary` / `summary_worker` | Schema bereit, Implementierung LATER |
| `semantic_search` | `embedding` | Schema bereit, Implementierung LATER |

---

## E) CLI-Verwendungskommandos

```bash
cd /Users/bayramgul/briefpilot-clean
DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"

# Heutiger Überblick
$DOCKER compose -f backend/docker-compose.yml exec api \
  python scripts/ai_usage_report.py --since today

# Letzten 7 Tage als TXT speichern
$DOCKER compose -f backend/docker-compose.yml exec api \
  python scripts/ai_usage_report.py --since 7d \
  > /tmp/ai_cost_haftalik.txt && open /tmp/ai_cost_haftalik.txt

# Letzte 30 Tage, mehr Ereignisse
$DOCKER compose -f backend/docker-compose.yml exec api \
  python scripts/ai_usage_report.py --since 30d --limit 50
```

**Skriptpfad:** `backend/scripts/ai_usage_report.py`

**Optionen:**

| Option | Standard | Werte |
|--------|----------|-------|
| `--since` | `today` | `today`, `24h`, `7d`, `30d` |
| `--limit` | `20` | beliebige positive Ganzzahl |

---

## F) Berichtsabschnitte

Der CLI-Bericht enthält vier Abschnitte:

1. **TOTAL** — Gesamtanzahl Aufrufe, Token-Summen, geschätzte Kosten, Fehleranzahl
2. **BY FEATURE / ROUTE / PROVIDER / MODEL** — Aufschlüsselung nach Verwendungsbereich und Technologie
3. **HOURLY SUMMARY** — Stündliche Aggregation (max. 48 Stunden)
4. **RECENT EVENTS** — Letzte N Ereignisse: Zeitstempel, Route, Modell, Dokument-ID-Prefix (8 Zeichen), Tokens, Kosten, Status

---

## G) Verifiziertes Smoke-Ergebnis (2026-06-18)

Erstes echtes Dokument erfolgreich telemetrisiert:

| Feld | Wert |
|------|------|
| provider | `anthropic` |
| model | `claude-haiku-4-5-20251001` |
| route | `decision_worker` |
| input_tokens | 1.322 |
| output_tokens | 341 |
| total_tokens | 1.663 |
| estimated_cost_usd | 0,00302700 $ |
| latency_ms | 3.096 ms |
| success | `true` |

Kein Dokumentinhalt oder PII in der Tabelle.

---

## H) Operationelle Entscheidungen

| Thema | Entscheidung |
|-------|-------------|
| AI usage telemetry | **PASS** — produziert korrekte Zeilen |
| CLI-Bericht | **PASS** — verifiziert mit `--since today` und `--since 7d` |
| Frontend/Admin-Dashboard | **LATER** |
| Automatischer täglicher Bericht (Cron) | **LATER** |
| Reply-Draft-Kostenverfolgung | **Schema-bereit**, Implementierung LATER |

---

## I) Relevante Dateien

| Datei | Beschreibung |
|-------|-------------|
| `backend/app/services/llm_usage.py` | Kernmodul: Preistabelle, `estimate_cost_usd`, `persist_usage_event`, `emit_extraction_usage` |
| `backend/app/services/llm.py` | Provider-Klassen: `OpenAIProvider.explain()`, `AnthropicProvider.explain()` — beide rufen `persist_usage_event` auf |
| `backend/app/models/ai_usage.py` | SQLAlchemy-Modell `AiUsageEvent` |
| `backend/alembic/versions/20260618_0003_ai_usage_events.py` | Alembic-Migration — Revision 0003 |
| `backend/scripts/ai_usage_report.py` | CLI-Berichtsskript |
| `backend/tests/test_ai_usage_telemetry.py` | 12 Tests: Kosten, Persistenz, Fehlertoleranz, PII-Guard |
| [LLM_USAGE_TELEMETRY.md](LLM_USAGE_TELEMETRY.md) | Strukturierte Log-Events (`llm.usage`) — ergänzt diese Datei |
| [AI_COST_STRATEGY_PLAN.md](AI_COST_STRATEGY_PLAN.md) | Parser-First-Gate + Fallback-Strategie |
