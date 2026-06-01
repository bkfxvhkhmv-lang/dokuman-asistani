# Product Consistency Audit — Saved Document Actions

## Report Metadata
- **Author/Agent:** Claude (Sonnet 4.6)
- **Role:** Product consistency audit + mobile export fix
- **Date:** 2026-06-01
- **Repository:** bp_canavar_v6_refactor
- **Branch:** feature/ocr-api-integration
- **Commits:** `affa541` · `93de9c27`
- **Task type:** audit + fix
- **Scope:** Detail screen export/share actions vs OCR MVP result screen
- **Status:** FOLLOW-UP REQUIRED (Sicherer Link + Steuerberater quick-link deferred)

---

## 1. Scope
- Feature area: Detail screen export/share actions vs OCR MVP result screen
- Folders: `src/features/detail/`, `src/features/ocr-mvp/`, `src/store/`, `src/services/`
- Trigger: Excel export added to ExportierenSheet (affa541) → broader consistency check requested

---

## 2. Search Commands
```bash
grep -n "handleOriginalTeilen|v4DocId|onOriginal" sharing.ts
grep -n "ocrJobId" ocrMvpToV4Document.ts
grep -n "v4DocId|ocrJobId" store/types.ts
grep -n "downloadOcrResult|Excel" OcrMvpResultCard.tsx
grep -n "shareOriginalFile|v4DocId|local|uri" sharing.ts
```

---

## 3. Files Touched
| File | Reason | Change type |
|------|--------|-------------|
| `src/features/detail/detail-modals/ExportierenSheet.tsx` | Add `onExcel` prop + Excel option | code |
| `src/features/detail/DetailModalsContainer.tsx` | Wire `handleExcelDownload` + `onExcel` | code |
| `src/features/detail/hooks/document-actions/sharing.ts` | Local fallback for Originaldatei | code |

---

## 4. Findings

### BLOCKER — Originaldatei teilen silently fails for all local docs
- **Status:** FIXED (93de9c27b)
- **Severity:** Blocker
- **User impact:** Every OCR MVP document showed "Originaldatei teilen" but tapped → "Noch nicht synchronisiert". All TestFlight documents affected.
- **Root cause:** `runHandleOriginalTeilen` required `v4DocId` (cloud sync ID). OCR MVP documents are local-only; `v4DocId` is never set. Button visibility used `dok.uri` (always present for local docs) → always shown, always failed.
- **Fix:** When `v4DocId` missing, share `dok.uri` or `pages[0].uri` directly via `Sharing.shareAsync`. Error only if no local uri either.

### FIXED — Excel missing from saved document Detail
- **Status:** FIXED (affa541)
- **Severity:** Should fix
- **User impact:** Could not re-download Excel after leaving analysis result screen.
- **Root cause:** `downloadOcrResult` only wired in `OcrMvpResultCard`, not in `ExportierenSheet`.
- **Fix:** Added `onExcel` prop to `ExportierenSheet`; `DetailModalsContainer` passes handler when `dok.ocrJobId` present.

### INTENTIONAL — Sicherer Link fails for local docs
- **Status:** Later
- **Severity:** Should fix (post-TestFlight)
- **User impact:** "Sicherer Link" button visible for local docs, fails with "Nicht synchronisiert".
- **Root cause:** Same pattern as Originaldatei — requires `v4DocId`.
- **Decision:** Not fixed now. Requires cloud sync infrastructure decision. Add to post-TestFlight backlog.

### OK — ocrJobId correctly set on save
- **Status:** Intentional / working
- `ocrMvpToV4Document.ts:249` sets `ocrJobId: result.job_id?.trim() || null`
- Excel + Besser Erkennen both depend on this — confirmed working.

### LATER — Steuerberater export not reachable from Detail
- **Status:** Later
- User must navigate to ExportBildschirm separately. No quick link from Detail.

---

## 5. Decisions
**Changed:**
- Originaldatei local fallback: shares local file when no cloud sync
- Excel added to ExportierenSheet with `ocrJobId` guard

**Not changed:**
- Sicherer Link — requires cloud sync, deferred
- Steuerberater from Detail — separate screen, deferred
- ABBYY provider code — quarantined, not removed
- Payment / AppSheet / AI Labeler — out of scope

---

## 6. Validation
- `npx tsc --noEmit` → 0 errors after both commits
- Manual: Excel download in ExportierenSheet wired correctly
- Manual: Originaldatei local fallback path verified by code review
- Remaining risk: Sharing.shareAsync behavior with different file types (jpg/pdf) not device-tested yet

---

## 7. Commits
| Hash | Message |
|------|---------|
| `affa541` | fix(export): add Excel option to saved document export sheet |
| `93de9c27` | fix(export): share local uri when Originaldatei has no v4DocId |

---

## 8. Follow-ups
| Priority | Task | File | Notes |
|----------|------|------|-------|
| SHOULD FIX | Sicherer Link: hide or disable with clear message when `v4DocId` missing | `ExportierenSheet.tsx`, `sharing.ts` | Same pattern as Originaldatei fix |
| LATER | Steuerberater export quick-link from Detail MoreMenu | `useDetailMoreItems.ts` | Navigate to ExportBildschirm filtered |
| LATER | Blurlu scan uyarısı: if absender+betrag+datum all null after OCR → show retry banner | `OcrMvpResultCard.tsx` | No backend change needed |
| LATER | Suche ekranı: "Alle" seçili geldiğinde kartlar hemen listelenmeli | Suche screen component | Initial render shows empty list |

---

## Ownership
This report was prepared by: **Claude (Sonnet 4.6)**

Responsible changed files:
- `src/features/detail/detail-modals/ExportierenSheet.tsx` — Excel option added
- `src/features/detail/DetailModalsContainer.tsx` — Excel download handler
- `src/features/detail/hooks/document-actions/sharing.ts` — Originaldatei local fallback
- `docs/audits/2026-06-01-claude-product-consistency-audit.md` — this report

Follow-up owner suggestion:
- **Claude:** Sicherer Link visibility fix (hide/disable when no `v4DocId`)
- **Claude:** Suche "Alle" initial render fix
- **Claude or Codex:** Steuerberater quick-link from Detail MoreMenu
