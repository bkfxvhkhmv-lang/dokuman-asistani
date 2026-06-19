# Duplicate Upload Behavior — Measured (2026-06-18)

> **Classification:** NEW DOCUMENT DUPLICATE  
> **Implementation fix:** HOLD — see [BACKEND_UPLOAD_CHECKSUM_DEDUPE_DESIGN.md](BACKEND_UPLOAD_CHECKSUM_DEDUPE_DESIGN.md)

---

## Test

Same PDF bytes uploaded twice via `POST /api/v4/documents/` (authenticated).

**File (masked):** `shadow_test_belgesi_S2_001_rechnung.pdf`  
**Checksum prefix:** `493e020c35a6`

| Upload | API | document_id | OCR | decision_worker | ai_usage | shadow_compare |
|--------|-----|-------------|-----|-----------------|----------|----------------|
| 1st | **201** | `11929130…` | Yes | Yes | +1 row ($0.002491) | Yes |
| 2nd | **201** | `84ef002b…` | Yes | Yes | +1 row ($0.002491) | Yes |

- Same checksum, **different** document IDs  
- Cost **doubled** (~+$0.0025 per re-upload for this PDF)

---

## Decisions (locked 2026-06-18)

| Item | Verdict |
|------|---------|
| Duplicate upload bug | **CONFIRMED** |
| Today V4 UX | Poor — no warning, re-cost, list clutter |
| Target | **200 OK** + `duplicate: true` → existing doc + toast |
| PR A (share/import) | **NOW** |
| PR B (dedupe + toast) | **HOLD** — after PR A |
| Batch 50 upload | **HOLD** — until PR A + duplicate risk addressed |
| Design doc | **PASS** — [BACKEND_UPLOAD_CHECKSUM_DEDUPE_DESIGN.md](BACKEND_UPLOAD_CHECKSUM_DEDUPE_DESIGN.md) |

---

## Code notes (no behavior change in this doc)

- Backend computes `checksum` on upload but does **not** query before insert (`documents.py`).
- `useCoreScanJob` always calls `uploadDocumentV4Safe` — no checksum check.
- `findDuplicateImportByFileSize` applies to **local quick-save** only, not V4 analyse upload.

---

## Operational impact

- **Batch 50 upload:** HOLD until PR A (share/import) + PR B (dedupe) risks addressed
- **Bulk re-upload of known files:** HOLD — wastes OCR + LLM cost
- **Next focus:** PR A — Android share/import fix
