# BriefPilot Product Roadmap — Quiet Document Workflow

**Status:** Active product roadmap (revised)  
**Son güncelleme:** 2026-06-20  
**Kategori:** Product direction — docs only  
**Bağımlılık:** [CANONICAL_CONTEXT.md](CANONICAL_CONTEXT.md)

> **Numara kuralı:** Backlog maddeleri (aşağıdaki isimler) ≠ GitHub PR numarası. PR açılınca GitHub # netleşir; konuşmada backlog **adı** kullanılır.

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

### 2. Max 2–3 visible cards on Detail + accordion actions

- Show only the most relevant cards for this document type
- Collapse the rest under **„Weitere Aktionen“** accordion (**Detail card limit + accordion actions**)
- **Accordion content must be lazy-rendered** — closed accordion must not mount heavy cards
- One clear primary action is enough; secondary actions stay reachable, not dominant

**Scope lock (Detail card limit + accordion actions):**

- No new banner
- No **BriefPilot empfiehlt** header
- No AI toy UI
- No more than 2–3 visible cards
- Accordion content must be lazy-rendered

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

PDF export, sign, edit, delete, OCR-Rohtext, technical debug — available under **Weitere Aktionen** accordion, not competing with the main workflow.

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

## 3. Active product backlog (canonical)

Sıralı yapılacaklar listesi. GitHub PR numarası backlog adından bağımsızdır.

### 1. isDirty false positive fix

| | |
|---|---|
| **Durum** | GitHub [#191](https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/191) open |
| **Amaç** | Edit modal değişiklik yokken „Änderungen verwerfen?“ göstermesin. |

### 2. Date / Betrag / numeric input polish

| | |
|---|---|
| **Durum** | #191 merge sonrası |
| **Amaç** | |
| | Tarihler ISO placeholder göstermesin |
| | Almanca format: **TT.MM.JJJJ** |
| | Tarih alanları **DatePicker** kullansın |
| | Tutar Almanca formatta görünsün: **99,36 €** |
| | Metrekare / kişi / tutar alanları **numeric keyboard** kullansın |

### 3. Detail card limit + accordion actions

*Türkçe:* Detail sadeleştirme — maksimum 2–3 görünür kart + akordiyon sistemi

| | |
|---|---|
| **Durum** | Date/Betrag polish sonrası |
| **Amaç** | |
| | Detail ekranında maksimum **2–3 görünür kart** |
| | Geri kalan aksiyonlar **„Weitere Aktionen“** akordiyonu altında |
| | Akordiyon kapalıyken içerideki ağır kartlar **mount/render edilmesin** |
| | Secondary, destructive ve teknik aksiyonlar görünür alandan çıkarılsın |

**Görünür kalacak yapı:**

1. Belge kimliği / kısa özet
2. Belge tipine göre en alakalı ana işlem
3. En fazla bir yardımcı işlem

**Akordiyon altına taşınacaklar:**

- Bearbeiten
- PDF exportieren
- PDF unterschreiben
- Originaltext / OCR anzeigen
- Teilen
- Löschen
- technische Details
- secondary workflow actions

**Scope lock:**

- No new banner
- No BriefPilot empfiehlt header
- No AI toy UI
- No more than 2–3 visible cards
- Accordion content must be lazy-rendered

### 4. Settings production cleanup

| | |
|---|---|
| **Amaç** | |
| | Production’da „Erweitert · Profi-Optionen“ görünmesin |
| | „Demo zurücksetzen“ görünmesin |
| | „Abmelden“ kırmızı/destructive gibi görünmesin |

### 5. Classification quality / Sonstiges reduction

| | |
|---|---|
| **Amaç** | |
| | „Sonstiges / Unbekannter Absender“ oranı düşsün |
| | Yanlış sender, missing sender’dan daha kötü kabul edilsin |
| | Rule parser + LLM fallback / prompt iyileştirmesi değerlendirilsin |

### 6. Invoice / expense export workflow

| | |
|---|---|
| **Amaç** | |
| | Faturalar gider/vergi için düzgün sınıflandırılsın |
| | Excel export hazırlansın |
| | Steuerberater export paketi hazırlansın |
| | Giderler günlük / haftalık / aylık / yıllık görülebilsin |

### 7. Nebenkosten workflow refinement

| | |
|---|---|
| **Amaç** | |
| | Mieter review |
| | Vermieter preparation |
| | Widerspruch / Antwortentwurf |
| | Supporting docs / export |

### 8. Calendar reminder UX

| | |
|---|---|
| **Amaç** | |
| | Frist / ödeme tarihi bulunursa kullanıcıya takvim hatırlatması önerilsin |
| | App kullanıcı adına otomatik riskli işlem yapmasın |

### 9. SEPA / GiroCode handoff

| | |
|---|---|
| **Amaç** | |
| | BriefPilot ödeme yapmasın |
| | IBAN / Empfänger / Betrag / Verwendungszweck çıkarılsın |
| | Kullanıcı kendi banka uygulamasına yönlendirilsin |
| | Fallback: Überweisungsdaten kopieren, SEPA/GiroCode QR |

---

## 4. Completed / shipped (reference)

| Item | Status | Notes |
|------|--------|-------|
| #186 | **Merged** | `ocr.doctype.*` keys hidden in UI |
| #189 audit | **Merged** | [ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md](ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md) |
| #189a / #190 | **Merged** | Display-layer sender consistency (no store writes) |
| #182 | **Merged** | Antwortentwurf entry (workflow, not banner) |
| #183 | **Merged** | Typography tokens |

---

## 5. Phase 1 — Trust & edit UX (current)

Fix broken basics before Detail layout work. Maps to backlog **§1–2**.

### isDirty false positive fix (backlog §1, GitHub #191)

| | |
|---|---|
| **Problem** | `EditDocumentModal` snapshots before fields hydrate → backdrop close shows „Änderungen verwerfen?“ without edits. |
| **Fix** | Snapshot after hydration; normalized compare; optional dirty only after first keystroke. |
| **Acceptance** | Open → close untouched → no alert. Edit → close → alert. |

### Date / Betrag / numeric input polish (backlog §2)

| | |
|---|---|
| **Scope** | `Belegdatum` / `Frist`: TT.MM.JJJJ labels, DatePicker, numeric keyboard for **Betrag**. |
| **Acceptance** | No ISO placeholder in DE UI; picker + manual entry both work. |

### Absender / classification (ongoing)

| Track | Backlog | Notes |
|-------|---------|-------|
| Display fallback | #189a ✅ | Title/rohText inference; tax-footer demotion |
| Save-path sender | Later | `buildDocumentSender` + backend `absender` |
| Classification | §5 | Sonstiges rate down |

---

## 6. Phase 2 — Detail card limit + accordion actions

**Retired:** Intelligence Header, „BriefPilot empfiehlt“ MVP, loud recommendation banners.

**Replaced with:** sparse Detail, workflow entry points, **Weitere Aktionen** accordion with lazy render.

Maps to backlog **§3**.

### Detail card limit + accordion actions (backlog §3)

| | |
|---|---|
| **Problem** | Detail mounts many cards (NK, Antwortentwurf, Besser erkennen, payment, export…) — noisy and slow. |
| **Target** | Max **2–3** visible cards by document type; rest under **Weitere Aktionen** accordion. |
| **Rules** | **Lazy-render** accordion content; primary CTA from `actionMapping.ts`; NK / Antwortentwurf only when eligible. |
| **Scope lock** | No banner · No BriefPilot empfiehlt · No AI toy UI · ≤3 visible cards · lazy accordion |
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
│  Weitere Aktionen ▾         │  export, edit, delete, OCR, … (lazy)
└─────────────────────────────┘
```

---

## 7. Phase 3 — Settings & classification

Maps to backlog **§4–5**.

### Settings production cleanup (backlog §4)

Remove debug toggles, stale copy, and non-production entries from Settings (Erweitert · Profi-Optionen, Demo zurücksetzen, destructive Abmelden styling).

### Classification quality / Sonstiges reduction (backlog §5)

| | |
|---|---|
| **Problem** | Too many docs → Sonstiges + Unbekannter Absender. |
| **Approach** | Parser/shadow-informed heuristics; honest „unsicher“ badge; Besser erkennen when MEDIUM confidence. No fake precision. |
| **Acceptance** | Measurable Sonstiges drop on smoke set; no rise in wrong high-confidence labels. |

---

## 8. Phase 4 — Workflow lanes

Maps to backlog **§6–7**.

### Invoice / expense export workflow (backlog §6)

| | |
|---|---|
| **Scope** | Rechnung lane: expense tagging, Excel export, **Steuerberater** package, period summaries (day/week/month/year). |
| **Dependencies** | Reliable Betrag/Belegdatum (backlog §2); classification (backlog §5). |
| **Non-goals** | In-app tax advice; automated filing. |

### Nebenkosten workflow refinement (backlog §7)

| | |
|---|---|
| **Scope** | Mieter vs Vermieter paths; objection + Antwortentwurf; export bundle; only on NK-eligible docs (backlog §3 gating). |
| **Safety** | Template + disclaimer; no automated Widerspruch filing. |

---

## 9. Phase 5 — Later premium / handoff

Maps to backlog **§8–9**.

### Calendar reminder UX (backlog §8)

Export **Frist** / Termin to device calendar. User confirms each event; no background writes; minimal event title (no full doc text).

### SEPA / GiroCode handoff (backlog §9)

Pre-fill bank app: IBAN, Betrag, Verwendungszweck. **No payment execution in app.** User confirms in bank app. Fallback: copy Überweisungsdaten, SEPA/GiroCode QR.

---

## 10. Prioritized order (backlog §1–9)

```
isDirty fix → Date/Betrag polish → Detail card limit + accordion actions → Settings cleanup → Classification → Invoice export → NK workflow → Calendar → SEPA handoff
```

| Order | Backlog item | Notes |
|-------|--------------|-------|
| 1 | isDirty false positive fix | GitHub #191 open |
| 2 | Date / Betrag / numeric input polish | After #191 |
| 3 | **Detail card limit + accordion actions** | Lazy accordion; scope lock |
| 4 | Settings production cleanup | |
| 5 | Classification quality / Sonstiges reduction | |
| 6 | Invoice / expense export workflow | |
| 7 | Nebenkosten workflow refinement | |
| 8 | Calendar reminder UX | |
| 9 | SEPA / GiroCode handoff | |

**Do not merge:** Detail card limit + accordion actions with invoice export in one PR. Classification with parser routing switch in one PR.

**Parallel OK:** Settings cleanup while Date/Betrag polish in review.

---

## 11. Non-goals

| Non-goal | Reason |
|----------|--------|
| Large hero / „BriefPilot empfiehlt“ banner | Retired direction — noisy, toy-like |
| „AI assistant show“ UI | User wants workflow, not coach |
| 6+ visible cards on Detail | Violates quiet layout principle |
| Stacked warning cards by default | Same |
| Legal advice claims | Entwurf + disclaimer only |
| Payment execution inside app | Regulatory risk; handoff only (backlog §9) |
| OCR/parser rewrite without scoped proof | Shadow-mode first |
| Loud Home dashboard metrics wall | Optional later; not current priority |

---

## 12. Definition of „production-ready“ workflow app

- [ ] **No raw technical keys** in UI (#186 ✅)
- [ ] **Absender / Typ / Datum / Betrag** trustworthy enough for export (#189a ✅ display; backlog §5)
- [ ] **Edit flow** — no false dirty (backlog §1 / #191)
- [ ] **DE date + numeric entry** (backlog §2)
- [ ] **Detail card limit + accordion actions** — ≤3 visible cards; lazy accordion (backlog §3)
- [ ] **Sonstiges rate** materially down (backlog §5)
- [ ] **Invoice lane** — store, tag, export (backlog §6)
- [ ] **NK workflow** focused, role-aware (backlog §7)
- [ ] **Settings** production-clean (backlog §4)
- [ ] **Cost monitoring** for owner — [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md)

---

## 13. Retired concepts (do not reintroduce without explicit decision)

| Retired | Replacement |
|---------|-------------|
| Detail Intelligence Header | **Detail card limit + accordion actions** |
| „BriefPilot empfiehlt“ banner | Contextual workflow entry (Antwortentwurf, NK, export) |
| Home „Aktive Risiken“ metrics wall | Calm feed; optional subtle indicators later |
| Assistant-first marketing copy | Quiet document workflow |

---

## References

| Doc | Relevance |
|-----|-----------|
| [ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md](ABSENDER_EXTRACTION_INVESTIGATION_2026-06-19.md) | Absender trust (#189a done) |
| [PARSER_CONFIDENCE_GATE_DESIGN.md](PARSER_CONFIDENCE_GATE_DESIGN.md) | Classification (backlog §5) |
| [AI_COST_DASHBOARD_BACKLOG.md](AI_COST_DASHBOARD_BACKLOG.md) | Owner cost visibility |

---

*For Claude / Cursor / Kimi: use backlog **names** (§1–9), not GitHub PR numbers. Trust fixes before Detail card limit + accordion actions. No banner PRs. UI copy German; this doc English + German/Turkish product terms.*
