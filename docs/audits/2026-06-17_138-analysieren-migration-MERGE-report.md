# #138 Analysieren Migration — Merge Report

**Date:** 2026-06-17  
**PR:** https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/138  
**Merge strategy:** squash  
**New main HEAD:** `2f175a051bda71abd369c1460c9c7162f1109334`

---

## A) #138 Merge Result

- **Status:** ✅ Successfully merged into `main`
- **Merge commit:** `2f175a051bda71abd369c1460c9c7162f1109334`
- **Merge strategy:** squash
- **Branch deleted after merge:** not yet (optional cleanup)

---

## B) New Main Commit Hash

```
2f175a051bda71abd369c1460c9c7162f1109334
```

---

## C) `git log -8`

```text
2f175a051 feat(detail): migrate Analysieren to core-api backend (#138)
17475277a perf(backend): use pdf text layer before paddleocr fallback (#137)
947fb89ac fix(backend): parse paddleocr v5 rec_texts results (#136)
27a91f814 fix(backend): mark documents completed after OCR text save (#135)
1f9bd47b6 feat(ocr): fetch backend worker result after polling completes (#134)
a578022f0 feat(backend): expose canonical document worker result (#131)
ff1bdb5a4 fix(backend): support paddleocr v5 result tuples (#133)
1d262703f fix(backend): pin fastapi before route instrumentation regression (#132)
```

---

## D) `git status --short`

```text
(no output → working tree clean)
```

---

## E) Stash Count

```text
6
```

6 pre-existing stashes; none belong to this change.

---

## F) HEAD~1..HEAD Changed Files

```text
docs/audits/2026-06-17_138-analysieren-migration-PR-report.md
docs/audits/2026-06-17_138-analysieren-migration-final-report.md
docs/audits/2026-06-17_upload-scan-analyze-chain-audit.md
docs/reports/REPORT_INDEX.md
src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx
src/features/detail/hooks/useAnalyzeSavedDocument.ts
src/services/v4EnqueueUpload.ts
```

---

## G) `tsc` Result

```text
$ npx tsc --noEmit --skipLibCheck
(no output → success)
```

✅ PASS

---

## H) `jest` Result

```text
$ npx jest src/__tests__/buildAnalyzedDocumentUpdate.test.ts src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx --no-coverage
PASS src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx
PASS src/__tests__/buildAnalyzedDocumentUpdate.test.ts

Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
Snapshots:   0 total
```

✅ PASS

---

## I) Backend Curl Smoke Result

```text
$ curl -s http://localhost:8000/api/v4/health/
{"status":"ok","ts":"2026-06-17T14:49:57.744140+00:00", ...}
```

✅ PASS

---

## J) Legacy Detail Analysieren Path Removed?

**Yes.**

`rg` on `src/features/detail src/hooks` shows only:
- `useOcrMvpJob.ts` — still exported for other screens.
- `useAnalyzeSavedDocument.ts` — imports only the **type** `OcrMvpStatus`/`OcrMvpErrorKind`.
- `toUserFacingAnalyseErrorMessage.ts` / `isUnanalysedQuickSaved.ts` — import only the **type**.
- `buildAnalyzedDocumentUpdate.ts` — still exists but no longer used by `useAnalyzeSavedDocument`.

No runtime call to `POST /documents/analyze` remains in the Detail Analysieren flow.

✅ PASS

---

## K) Protected Fields Preserved?

**Yes.**

The new path uses `buildResultUpdate` from `src/services/v4DocumentJobPoll.ts`, which writes only:
- `rohText`, `confidence`, `detectedLanguage`, `ocrJobId`
- `aiDisplayTitle`, `aiDocumentType`, `aiSender`, `aiLabelledAt`

It never overwrites `titel`, `typ`, `absender`, `customTitle`, `userOrdner`, `frist`, `betrag`, `zusammenfassung`, `kurzfassung`, `iban`.

✅ PASS

---

## L) Package / Native / Config Untouched?

- `package.json` — unchanged
- `app.json` / `eas.json` — unchanged
- Native iOS/Android project files — unchanged
- `src/config.ts` — unchanged

✅ PASS

---

## M) Backend Source Untouched?

- No `.py` files changed in this merge.
- No Alembic migrations added.
- No backend schema changes.

✅ PASS

---

## N) Dockerfile Untouched?

- No `Dockerfile*` changes.

✅ PASS

---

## O) Main Summary Updated?

**Yes.**

`docs/reports/REPORT_INDEX.md` was updated in this merge to include:
- 2026-06-17 Chain Audit link
- #138 Migration Final Report link
- #138 PR Report link
- This Merge Report will be linked after commit.

✅ PASS

---

## P) Auditor Verdict

| Criterion | Status |
|-----------|--------|
| Merge succeeded | ✅ PASS |
| Main HEAD updated cleanly | ✅ PASS |
| Working tree clean | ✅ PASS |
| `tsc` passes on main | ✅ PASS |
| `jest` 5/5 passes on main | ✅ PASS |
| Backend health / curl smoke | ✅ PASS |
| Legacy Detail Analysieren path removed | ✅ PASS |
| Protected fields preserved | ✅ PASS |
| Package/native/config untouched | ✅ PASS |
| Backend source untouched | ✅ PASS |
| Dockerfile untouched | ✅ PASS |
| Main summary updated | ✅ PASS |

**Overall:** ✅ **PASS**

---

## Next Steps

- #138 is closed.
- #139 AI Labeler migration can now begin.
