# BriefPilot Assistant-First Roadmap

**Status:** Active product roadmap  
**Son güncelleme:** 2026-06-19  
**Kategori:** Product direction — docs only, no app code in this file  
**Bağımlılık:** [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md), [CURRENT_BACKLOG.md](CURRENT_BACKLOG.md)

---

## 1. Executive summary

### Current problem

BriefPilot **works**: upload, OCR, extraction, Detail, Nebenkosten entry point, Antwortentwurf (#182) exist. Yet the product still reads as a **tool** — a list of features and fields — rather than an assistant that tells the user what matters and what to do next.

Typical friction today:

- Raw or semi-technical strings leak into UI (`ocr.doctype.*` keys on some paths).
- **Absender** and **Belegdatum** are unreliable or inconsistently formatted.
- Detail screen stacks cards and buttons without a single clear recommendation.
- **Sonstiges / Unbekannter Absender** is overused as a classification fallback.
- Home shows documents; it does not surface **active risks, Fristen, or money impact**.

### Target

An **assistant-first layer** where BriefPilot proactively explains:

- **Risk** — what could go wrong if ignored
- **Frist** — deadline urgency
- **Money impact** — amount, Nachzahlung, Mahngebühr
- **Next best action** — one primary CTA per document

Product voice: **„BriefPilot empfiehlt“** — not „here are 12 buttons“.

### Key principle

```
one document → one clear recommendation → one primary action
```

Secondary actions (Antwortentwurf, Nebenkosten prüfen, Kalender, Zahlungsdaten) support the recommendation; they do not compete with it.

---

## 2. Phase 1 — Trust fixes

Trust must precede redesign. Users will not follow assistant recommendations if Absender, date, or type labels feel broken.

### #186 — `ocr.doctype.*` visible key cleanup

| | |
|---|---|
| **Problem** | Some UI paths render untranslated `ocr.doctype.<slug>` keys (e.g. backend kinds without a translation entry) instead of German labels. `resolveOcrDocTypeLabel` exists but is not applied everywhere. |
| **User impact** | Document feels unfinished; undermines confidence in AI extraction. User cannot quickly answer „Was ist das für ein Brief?“ |
| **Proposed fix** | Audit all type display paths (Home feed, Detail header, Angaben tab, OCR summary). Route through `resolveOcrDocTypeLabel` or equivalent. Add missing `ocr.doctype.*` keys for backend slugs in `translations.ts`. Fallback: show raw German word from backend, never the key string. |
| **Risk** | Low — display-only. Regression if a path bypasses the resolver. |
| **Acceptance criteria** | No visible `ocr.doctype.` substring in DE UI. `ocrDocTypeLabel.test.ts` extended for known leak paths. Manual smoke: invoice, settlement, unknown, and unmapped backend kind. |

---

### #187 — Absender extraction / display inconsistency

| | |
|---|---|
| **Problem** | **Absender** varies between stored value, `safeDisplayAbsender` recovery, footer/legal line false positives, and edit-modal raw field. Same document may show sender on Home but blank on Detail, or show garbage (IBAN line, legal footer). |
| **User impact** | User cannot trust „who sent this“ — core context for every recommendation. |
| **Proposed fix** | Unify display chain: always use `safeDisplayAbsender(absender, confidence, rohText)` on read paths. Align edit-modal initial value with sanitized display (or show „nicht erkannt“ + suggest Besser erkennen). Document when stored `absender` is intentionally empty vs. recoverable. |
| **Risk** | Medium — wrong normalization could hide a valid sender. Requires fixture tests from real PDFs (Vodafone, Finanzamt, Vermieter). |
| **Acceptance criteria** | Home title/subtitle and Detail Absender row show the same sender for the same doc. Footer/legal lines never shown as Absender. „Unbekannter Absender“ only when recovery truly fails. |

---

### #188 — Edit form `isDirty` false positive

| | |
|---|---|
| **Problem** | `EditDocumentModal` snapshots `initialRef` on `visible` only; modal fields may hydrate asynchronously from `modal.*` state after open. User taps backdrop without editing → „Änderungen verwerfen?“ alert. |
| **User impact** | Annoying false alarm; erodes trust in edit flow; users learn to dismiss warnings. |
| **Proposed fix** | Snapshot initial values **after** modal fields are fully hydrated (single `useEffect` when `visible && fieldsReady`). Normalize compare (trim strings, empty ↔ null). Optional: debounce dirty check until first user keystroke. |
| **Risk** | Low — modal UX only. |
| **Acceptance criteria** | Open edit → close without touch → no discard alert. Edit one field → close → alert shown. Save persists; reopen shows no dirty state. |

---

### #189a — Belegdatum placeholder / German date format copy fix

| | |
|---|---|
| **Problem** | Edit modal label says `Belegdatum (JJJJ-MM-TT)` with placeholder `z.B. 2026-04-30` — ISO format in a German product. `field.document_date` exists in i18n but hardcoded strings bypass it. |
| **User impact** | German users expect **TT.MM.JJJJ**. Mismatch causes entry errors and weakens „BriefPilot understands my post“. |
| **Proposed fix** | DE copy: label `Belegdatum`, placeholder `z.B. 15.04.2026`, helper text for format. Use `t('field.document_date')` and new keys for hint/validation. Accept both display format and normalized storage (ISO internally if needed). |
| **Risk** | Low — copy + parse normalization. |
| **Acceptance criteria** | No ISO placeholder in DE UI. User can enter `15.04.2026`; stored/displayed consistently on Detail Angaben tab. |

---

### #189b — DatePicker + numeric keyboard

| | |
|---|---|
| **Problem** | Belegdatum and Frist are free-text `AppInput` fields — error-prone on mobile, no calendar affordance. |
| **User impact** | Slow data entry; invalid dates; higher edit abandonment. |
| **Proposed fix** | Platform `DatePicker` (or existing design-system date component) for Belegdatum and Frist. Numeric/date keyboard where picker unavailable. Keep #189a German format in display layer. |
| **Risk** | Medium — platform differences (iOS/Android), timezone edge cases. |
| **Acceptance criteria** | Tap calendar icon → pick date → field shows DE format. Manual entry still works with validation message on invalid input. Frist and Belegdatum behave consistently. |

---

## 3. Phase 2 — Assistant-first Detail redesign

Phase 2 starts only after Phase 1 trust fixes merge. Goal: Detail becomes the **recommendation surface**, not a feature dump.

### Target UI principle

```
┌─────────────────────────────────────┐
│  BriefPilot empfiehlt               │
│  „Frist in 5 Tagen — Zahlung prüfen“│
│  [ Primary CTA ]                    │
├─────────────────────────────────────┤
│  Warum? · Risiko · Betrag · Frist   │
├─────────────────────────────────────┤
│  Secondary: Antwortentwurf · NK …   │
└─────────────────────────────────────┘
```

- **One primary CTA** per document (existing `actionMapping.ts` rules extend, not multiply).
- Recommendation text is **specific** (amount, days, sender), not generic „Zusammenfassung ansehen“ unless truly unknown.
- Legal safety copy stays visible; no „garantiert“ language.

### Sample German copy

| Scenario | „BriefPilot empfiehlt“ line | Primary CTA |
|---|---|---|
| Mahnung, €142, Frist 3 Tage | „Zahlungsfrist läuft in 3 Tagen ab. Prüfe Empfänger und Betrag, bevor du überweist.“ | Zahlungsdaten prüfen |
| Nebenkostenabrechnung, Nachzahlung | „Nachzahlung von 248 € — prüfe, ob die Positionen plausibel sind.“ | Nebenkosten prüfen |
| Behörde, Einspruchsfrist | „Einspruchsfrist endet am 12.07.2026. Reagiere rechtzeitig.“ | Antwortentwurf erstellen |
| Unbekannt / low confidence | „Absender oder Dokumenttyp unsicher — zuerst Angaben prüfen oder Besser erkennen.“ | Angaben prüfen |

### #190 — Detail Intelligence Header plan

| | |
|---|---|
| **Deliverable** | Design + engineering plan (no full implementation). Wireframe, data contract, component boundaries. |
| **Scope** | Define `DetailIntelligenceHeader` props: `recommendation`, `reasonBullets`, `urgency`, `primaryAction`, `confidence`. Map from `document_meta`, `risiko`, `frist`, `betrag`, `typ`, action plan. |
| **Out of scope** | Home redesign, parser rewrite, new LLM prompts. |

### #191 — „BriefPilot empfiehlt“ Intelligence Header MVP

| | |
|---|---|
| **Deliverable** | Ship header component on Detail (above tabs or replacing scattered summary cards). |
| **Data** | Rule-based first: `getPrimaryAction` + frist/betrag/typ heuristics. LLM-enriched headline optional later. |
| **Acceptance** | Every analysed doc shows a recommendation line + one primary button. Empty/loading: guided state, not blank. |

### #192 — Detail action hierarchy: primary / secondary / destructive

| | |
|---|---|
| **Problem** | Actions scattered: sticky footer, Angaben buttons, More menu, `ReplyDraftCard`, `NkSummaryCard` compete visually. |
| **Proposed fix** | Explicit tiers: **Primary** (one, filled), **Secondary** (outline/list), **Destructive** (delete, discard — buried, confirmed). Move „Nebenkosten prüfen“ and „Antwortentwurf“ to secondary row under recommendation. |
| **Moves up** | Intelligence header, primary CTA, Frist/Betrag/Risiko chips. |
| **Moves down** | Export, share, raw OCR debug, edit, delete. |
| **Out of scope** | New payment execution, new legal templates, full tab restructure. |

### #193 — Connect Nebenkosten + Antwortentwurf into new hierarchy

| | |
|---|---|
| **Problem** | NK and Antwortentwurf exist as isolated cards (#182 merged) but are not wired into assistant recommendation. |
| **Proposed fix** | When `typ` is Nebenkostenabrechnung / settlement → primary or strong secondary = Nebenkosten prüfen. When objection/reply scenario → Antwortentwurf as primary or secondary per `documentActionFlows`. Recommendation text references the linked flow. |
| **Acceptance** | NK-eligible doc: header mentions Nachzahlung/plausibility; CTA opens Nebenkostenassistent. Reply-eligible: header mentions Frist/reply; CTA opens Antwortentwurf. No duplicate competing CTAs. |

---

## 4. Phase 3 — Classification quality

Assistant recommendations are only as good as **typ**, **Absender**, and **confidence**.

### #194 — „Sonstiges / Unbekannter Absender“ quality fix

| | |
|---|---|
| **Problem** | Parser/LLM fallback over-assigns `Sonstiges` and `Unbekannter Absender`. Weak titles pollute Home. `isWeakTitle` helps display but not classification. |
| **Sender/entity extraction** | Improve `normalizeSender` coverage; expand brand/Behörde patterns; use `rohText` header block before footer. Shadow-mode logs (`PARSER_CONFIDENCE_GATE_DESIGN.md`) inform fixes — no blind routing switch. |
| **Classification fallback strategy** | Tier 1: parser HIGH → use parser typ/sender. Tier 2: MEDIUM → show „unsicher“ badge, suggest Besser erkennen. Tier 3: LOW / Sonstiges → assistant says „Typ unklar“ instead of fake precision. |
| **Acceptance** | Sonstiges rate drops on smoke set (target: measurable on 15-doc shadow batch). No increase in wrong high-confidence labels. User sees „unsicher“ not false certainty. |

### #195 — Home dashboard transformation

| | |
|---|---|
| **Problem** | Home is a document list. User must open each doc to learn what needs action. |
| **Target metrics (top of Home)** | |
| | **Aktive Risiken** — docs with `risiko=hoch` or Frist &lt; 7 days |
| | **Fristen** — next 3 deadlines across portfolio |
| | **Geld im Spiel** — sum of open Mahnung/Rechnung/Nachzahlung |
| | **Handlung nötig** — count of docs with unresolved primary action |
| **Proposed fix** | `HomeDashboardCards` / stats row consume store selectors; tap metric → filtered list. Copy in German; no fake precision on amounts. |
| **Out of scope** | Full feed redesign, new backend endpoints (client-side aggregation first). |

---

## 5. Phase 4 — Premium product layer

Features that deepen assistant value — gated as premium where noted.

### #196 — Contextual Nebenkosten role decision

| | |
|---|---|
| **What** | Nebenkosten flow adapts to user role: Mieter vs. Vermieter vs. WG — different copy, checks, and export templates. |
| **Why premium** | Advanced scenario coverage; reduces wrong advice surface for complex NK disputes. |
| **Dependencies** | #193 NK hierarchy; stable NK extraction; user profile / document context. |
| **Privacy/safety** | No automated Widerspruch filing; templates with disclaimer; amounts are estimates until user confirms. |

### #197 — Calendar sync

| | |
|---|---|
| **What** | Export Frist/Termin to device calendar (ICS / native calendar API). |
| **Why premium** | Habit-forming retention; „BriefPilot remembered my Frist“. |
| **Dependencies** | Reliable `frist` field (#189); permission UX; #192 primary action `add_to_calendar` already mapped for Terminbestätigung. |
| **Privacy/safety** | User confirms each export; no background calendar writes; event title excludes full document text. |

### #198 — SEPA / GiroCode payment handoff

| | |
|---|---|
| **What** | Pre-fill banking app handoff: IBAN, Betrag, Verwendungszweck — open external bank app / copy clipboard. |
| **Why premium** | Closes loop from „prüfen“ to „bezahlen“ without in-app payment. |
| **Dependencies** | #187 Absender/IBAN trust; `#192` prepare_payment primary action. |
| **Privacy/safety** | **No payment execution inside app.** No stored PIN/TAN. User always confirms in bank app. Clear copy: „BriefPilot leitet nur weiter.“ |

---

## 6. Prioritized PR order

Exact recommended merge sequence:

```
#186 → #187 → #188 → #189a → #189b → #190 → #191 → #192 → #193 → #194 → #195 → #196 → #197 → #198
```

| Order | PR | Phase | Rationale |
|---|---|---|---|
| 1 | #186 | Trust | Stop technical key leaks immediately |
| 2 | #187 | Trust | Sender is core to all recommendations |
| 3 | #188 | Trust | Unblock edit flow confidence |
| 4 | #189a | Trust | DE date copy — quick win |
| 5 | #189b | Trust | Date entry UX |
| 6 | #190 | Detail | Plan before build |
| 7 | #191 | Detail | Ship „BriefPilot empfiehlt“ MVP |
| 8 | #192 | Detail | Action hierarchy |
| 9 | #193 | Detail | Wire NK + Antwortentwurf |
| 10 | #194 | Classification | Better inputs to assistant |
| 11 | #195 | Home | Portfolio-level assistant view |
| 12 | #196 | Premium | NK role depth |
| 13 | #197 | Premium | Calendar handoff |
| 14 | #198 | Premium | Payment handoff |

**Parallel allowed:** #190 (plan doc) can start during #189b. #195 design exploration can start during #192 — but merge after #194 if metrics depend on classification labels.

**Do not merge together:** Trust fix + full Detail redesign in one PR. Classification routing change + UI header in one PR.

---

## 7. Non-goals

| Non-goal | Reason |
|---|---|
| Legal advice claims | Product is „Entwurf“ / guidance only; disclaimers remain mandatory |
| Free-form risky legal automation without disclaimer | High liability; template-first with user review |
| Payment execution inside app | Regulatory and trust risk; handoff only (#198) |
| OCR/parser rewrite unless scoped investigation proves need | Cost and regression risk; shadow-mode first per `PARSER_CONFIDENCE_GATE_DESIGN.md` |
| Full visual redesign before trust fixes | Polish on broken Absender/date erodes credibility |
| Replacing `ai_usage_events` telemetry | Cost monitoring stays; see [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md) |

---

## 8. Definition of „top app“ readiness

Checklist before marketing BriefPilot as assistant-first (not just document scanner):

- [ ] **No raw technical keys visible** — `ocr.doctype.*`, internal enums, debug slugs (#186)
- [ ] **Sender / date / type reliable enough** — same values across Home and Detail; DE date format (#187, #189a/b)
- [ ] **Edit flow trustworthy** — no false dirty state (#188)
- [ ] **Detail always explains next best action** — Intelligence Header live (#191)
- [ ] **One primary CTA per document** — hierarchy enforced (#192)
- [ ] **Nebenkosten + Antwortentwurf integrated** — not orphan cards (#193)
- [ ] **Classification honest about uncertainty** — Sonstiges rate down; „unsicher“ when needed (#194)
- [ ] **Home surfaces portfolio urgency** — risks, Fristen, money, action count (#195)
- [ ] **Empty/loading states guided** — „Wird analysiert…“ with progress hint, not blank cards
- [ ] **Cost monitoring visible to owner** — AI Cost Dashboard Phase 1+ per [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md)

---

## References

| Doc | Relevance |
|---|---|
| [CURRENT_BACKLOG.md](CURRENT_BACKLOG.md) | Nebenkosten, Antwortentwurf, typography, performance |
| [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) | Classification tiers for #194 |
| [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md) | Owner cost visibility |
| `src/features/detail/constants/actionMapping.ts` | Primary action rules |
| `src/utils/displaySanitizer.ts` | Absender/title display chain |
| `src/i18n/documentTypeLabels.ts` | OCR doctype resolver |

---

*For Claude / Cursor / Kimi: treat Phase 1 as blocking. Each PR should cite its roadmap item (#186–#198) in the PR description. UI copy German; this doc English + German product terms.*
