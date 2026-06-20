# BriefPilot Product Roadmap — Quiet Document Workflow

**Status:** Active product roadmap (revised)  
**Son güncelleme:** 2026-06-19  
**Kategori:** Product direction — docs only  
**Bağımlılık:** [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md), [CURRENT_BACKLOG.md](CURRENT_BACKLOG.md)

> **Direction change:** The earlier „BriefPilot empfiehlt“ / large assistant-header concept is **retired**. It felt noisy and toy-like. BriefPilot is a **quiet, practical document workflow app** — not an AI show.

---

## 1. Executive summary

### What BriefPilot is

A calm tool for German post and documents: scan, classify, store, and run focused workflows (reply draft, payment reminder, expense export, Nebenkosten review) when the user chooses.

### What BriefPilot is not

- Not a loud AI assistant with hero banners
- Not a stack of warning cards on every Detail screen
- Not a product that invents senders or types to look smart

### North-star principle

```
Quiet Document Workflow, not banners.
```

Data trust first. Few visible cards. User picks the workflow.

---

## 2. Core product principles

### 1. Quiet workflow, not banners

- No large **„BriefPilot empfiehlt“** hero or Intelligence Header
- No loud stacked warning / risk cards above the fold
- No AI-toy UI (glowing badges, fake certainty, chatty coach copy)
- Information density through **fields and actions**, not prose blocks

### 2. Max 2–3 visible cards on Detail

- Show only the most relevant cards for this document type
- Collapse the rest under **„Weitere Aktionen“**
- Do not mount/render every possible card by default (performance + clarity)
- One clear primary action is enough; secondary actions stay reachable, not dominant

### 3. Correct data before pretty UI

- **Absender**, **Dokumenttyp**, **Belegdatum**, **Betrag** must be reliable
- Wrong sender is worse than missing sender
- **Sonstiges / Unbekannter Absender** is a **trust bug**, not cosmetic polish
- Display fallbacks (#189a) help; save-path / classification fixes still required

### 4. User chooses workflow

After scan/import the user can:

- Save and classify only
- Open **Antwortentwurf**
- Set payment / **Frist** reminder
- Run **Excel** / tax export
- Enter **Nebenkosten** review flow

BriefPilot suggests paths through **contextual entry points**, not a mandatory assistant layer.

### 5. Secondary actions stay hidden

PDF export, sign, edit, delete, OCR-Rohtext, technical debug — available under **Weitere Aktionen** or Angaben, not competing with the main workflow.

### 6. Invoices are a major product lane

- Invoice storage and retrieval
- Expense tracking (tag, amount, date)
- Warranty / return support
- **Excel** export
- **Steuerberater** export package
- Daily / weekly / monthly / yearly expense overview

### 7. Nebenkosten is a focused workflow

- Mieter review
- Vermieter preparation
- Widerspruch / **Antwortentwurf**
- Supporting documents and export

Not a generic card on every Detail screen — only when document type warrants it.

---

## 3. Completed / shipped (reference)

| Item | Status | Notes |
|------|--------|-------|
| #186 | **Merged** | `ocr.doctype.*` keys hidden in UI |
| #189 audit | **Merged** | [ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md](ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md) |
| #189a / #190 | **Merged** | Display-layer sender consistency (no store writes) |
| #182 | **Merged** | Antwortentwurf entry (workflow, not banner) |
| #183 | **Merged** | Typography tokens |

---

## 4. Phase 1 — Trust & edit UX (current)

Fix broken basics before Detail layout work.

### #191 — Edit form `isDirty` false positive

| | |
|---|---|
| **Problem** | `EditDocumentModal` snapshots before fields hydrate → backdrop close shows „Änderungen verwerfen?“ without edits. |
| **Fix** | Snapshot after hydration; normalized compare; optional dirty only after first keystroke. |
| **Acceptance** | Open → close untouched → no alert. Edit → close → alert. |

### #192 — Date / Betrag / numeric input polish

Combines former #189a (DE date copy) and #189b (DatePicker).

| | |
|---|---|
| **Scope** | `Belegdatum` / `Frist`: TT.MM.JJJJ labels, DatePicker, numeric keyboard for **Betrag**. |
| **Acceptance** | No ISO placeholder in DE UI; picker + manual entry both work. |

### Absender / classification (ongoing)

| Track | PR | Notes |
|-------|-----|-------|
| Display fallback | #189a ✅ | Title/rohText inference; tax-footer demotion |
| Save-path sender | Later | `buildDocumentSender` + backend `absender` — after display proves value |
| Classification | #195 | Sonstiges rate down |

---

## 5. Phase 2 — Quiet Detail layout

**Retired:** #190 Intelligence Header plan, #191 „BriefPilot empfiehlt“ MVP, loud recommendation banners.

**Replaced with:** sparse Detail, workflow entry points, collapsed secondary actions.

### #193 — Detail visible-card limit + „Weitere Aktionen“

| | |
|---|---|
| **Problem** | Detail mounts many cards (NK, Antwortentwurf, Besser erkennen, payment, export…) — noisy and slow. |
| **Target** | Max **2–3** visible cards by document type; rest under **Weitere Aktionen**. |
| **Rules** | Lazy-mount collapsed section; primary CTA from existing `actionMapping.ts` (one per type); NK / Antwortentwurf only when eligible. |
| **Out of scope** | New LLM copy blocks; hero header; stacked risk banners. |

### Detail hierarchy (quiet)

```
┌─────────────────────────────┐
│  Title · Typ · Absender     │  ← reliable fields, not banner
│  Betrag · Frist (if any)    │
├─────────────────────────────┤
│  [1–2 workflow cards max]   │  e.g. Antwortentwurf OR Nebenkosten
├─────────────────────────────┤
│  Angaben (fields)           │
├─────────────────────────────┤
│  Weitere Aktionen ▾         │  export, edit, delete, OCR, …
└─────────────────────────────┘
```

---

## 6. Phase 3 — Settings & classification

### #194 — Settings production cleanup

Remove debug toggles, stale copy, and non-production entries from Settings. Align with store/release expectations.

### #195 — Classification quality / Sonstiges reduction

| | |
|---|---|
| **Problem** | Too many docs → Sonstiges + Unbekannter Absender. |
| **Approach** | Parser/shadow-informed heuristics; honest „unsicher“ badge; Besser erkennen when MEDIUM confidence. No fake precision. |
| **Acceptance** | Measurable Sonstiges drop on smoke set; no rise in wrong high-confidence labels. |

---

## 7. Phase 4 — Workflow lanes

### #196 — Invoice / expense export workflow

| | |
|---|---|
| **Scope** | Rechnung lane: expense tagging, Excel export, **Steuerberater** package, period summaries (day/week/month/year). |
| **Dependencies** | Reliable Betrag/Belegdatum (#192); classification (#195). |
| **Non-goals** | In-app tax advice; automated filing. |

### #197 — Nebenkosten workflow refinement

| | |
|---|---|
| **Scope** | Mieter vs Vermieter paths; objection + Antwortentwurf; export bundle; only surfaced on NK-eligible docs (#193 gating). |
| **Safety** | Template + disclaimer; no automated Widerspruch filing. |

---

## 8. Phase 5 — Later premium / handoff

### #198 — Calendar reminder UX

Export **Frist** / Termin to device calendar. User confirms each event; no background writes; minimal event title (no full doc text).

### #199 — SEPA / GiroCode handoff

Pre-fill bank app: IBAN, Betrag, Verwendungszweck. **No payment execution in app.** User confirms in bank app.

---

## 9. Prioritized PR order (revised)

```
#191 → #192 → #193 → #194 → #195 → #196 → #197 → #198 → #199
```

| Order | PR | Focus |
|-------|-----|--------|
| 1 | #191 | isDirty false positive |
| 2 | #192 | Date / Betrag / numeric input |
| 3 | #193 | Detail 2–3 cards + Weitere Aktionen |
| 4 | #194 | Settings production cleanup |
| 5 | #195 | Classification / Sonstiges |
| 6 | #196 | Invoice / expense / Steuerberater export |
| 7 | #197 | Nebenkosten workflow |
| 8 | #198 | Calendar reminder |
| 9 | #199 | SEPA / GiroCode handoff |

**Do not merge:** Detail card limit (#193) + invoice export (#196) in one PR. Classification (#195) + parser routing switch in one PR.

**Parallel OK:** #194 Settings while #192 in review.

---

## 10. Non-goals

| Non-goal | Reason |
|----------|--------|
| Large hero / „BriefPilot empfiehlt“ banner | Retired direction — noisy, toy-like |
| „AI assistant show“ UI | User wants workflow, not coach |
| 6+ visible cards on Detail | Violates quiet layout principle |
| Stacked warning cards by default | Same |
| Legal advice claims | Entwurf + disclaimer only |
| Payment execution inside app | Regulatory risk; handoff only (#199) |
| OCR/parser rewrite without scoped proof | Shadow-mode first |
| Loud Home dashboard metrics wall | Optional later; not current priority |

---

## 11. Definition of „production-ready“ workflow app

- [ ] **No raw technical keys** in UI (#186 ✅)
- [ ] **Absender / Typ / Datum / Betrag** trustworthy enough for export (#189a ✅ display; #195 classification)
- [ ] **Edit flow** — no false dirty (#191)
- [ ] **DE date + numeric entry** (#192)
- [ ] **Detail shows ≤3 cards**; rest under Weitere Aktionen (#193)
- [ ] **Sonstiges rate** materially down (#195)
- [ ] **Invoice lane** — store, tag, export (#196)
- [ ] **NK workflow** focused, role-aware (#197)
- [ ] **Settings** production-clean (#194)
- [ ] **Cost monitoring** for owner — [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md)

---

## 12. Retired concepts (do not reintroduce without explicit decision)

| Retired | Replacement |
|---------|-------------|
| Detail Intelligence Header (#190) | Sparse fields + 1–2 workflow cards |
| „BriefPilot empfiehlt“ banner (#191 old) | Contextual workflow entry (Antwortentwurf, NK, export) |
| Home „Aktive Risiken“ metrics wall (#195 old) | Calm feed; optional subtle indicators later |
| Assistant-first marketing copy | Quiet document workflow |

---

## References

| Doc | Relevance |
|-----|-----------|
| [ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md](ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md) | Absender trust (#189a done) |
| [CURRENT_BACKLOG.md](CURRENT_BACKLOG.md) | Engineering backlog |
| [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) | #195 classification tiers |
| [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md) | Owner cost visibility |

---

*For Claude / Cursor / Kimi: trust fixes before Detail layout. No banner PRs. UI copy German; this doc English + German product terms.*
