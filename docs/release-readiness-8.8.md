# BriefPilot 8.8 — Release Readiness Snapshot

**Date:** 2026-06-09
**Base:** `origin/main` @ `5e2c815a3` (after PR #19 merge)
**Status:** Apple-independent trust/polish chain largely complete; TestFlight blocked on Apple/EAS gates.

---

## 1. Merged trust & polish chain

| PR | Title | Squash commit | Summary |
|----|-------|---------------|---------|
| [#14](https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/14) | Share human filename | `d6acec254` | Human-readable page share filenames via `exportFilename.ts` |
| [#15](https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/15) | Onboarding privacy copy | `fb9c3cc37` | Device storage + secure OCR/AI transfer + device-loss + optional personal cloud hint |
| [#16](https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/16) | Env hygiene | `5cc6dfbb7` | Untrack `.env.*` and debug keystore; update `.gitignore` |
| [#17](https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/17) | App icon assets | `b5607a910` | RGB 1024² icon; separate adaptive icon + splash safe zones |
| [#18](https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/18) | Visible i18n | `f31c64579` | P1 hardcoded UI strings → i18n (tabs, auth, budget modal) |
| [#19](https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/19) | Demo trust copy | `5e2c815a3` | `DemoTrustLabel` on demo cards + detail header; 7-language i18n |

**Not in this chain (separate / in flight):**

- PR #20 — feedback emoji removal, undo timer 5s, scanner back-exit audit (Claude, in progress)
- Local EAS commits on developer machine — **HOLD** until Apple Developer gates clear

---

## 2. Locked 6-month storage decision (2026-06-09)

These product promises are fixed for the first six months post-launch:

1. **Persistent storage:** Documents are stored on the user's device only. BriefPilot does not operate integrated server-side document storage or cloud backup in this period.
2. **OCR / AI processing:** Content may be transmitted securely to the BriefPilot backend for OCR and AI analysis (temporary processing, not long-term document hosting).
3. **No BriefPilot cloud backup UI:** Do not ship or promise in-app BriefPilot cloud backup or server document archive during the first six months.
4. **Personal cloud is optional:** Users may back up important documents to a cloud storage service they trust (iCloud, Google Drive, etc.) outside the app.
5. **Deferred feature:** Integrated cloud backup opt-in is explicitly deferred for ~6 months after launch.

Onboarding copy (PR #15) and demo trust labeling (PR #19) align with this decision.

---

## 3. Backend / GPU decision

| Topic | Decision |
|-------|----------|
| Production OCR/AI backend | Must **not** run on a home Mac or ad-hoc local machine |
| TestFlight phase | Scale-to-zero cloud GPU acceptable (cost-controlled) |
| Public launch | Likely requires stable cloud GPU/runtime (always-on or reliably warm) |
| Paddle OCR training | Separate R&D track — **not** the 8.8 production OCR path |

Client contract: secure temporary transfer for processing; no persistent server document store (see §2).

---

## 4. Remaining TestFlight blockers

| Blocker | State | Notes |
|---------|-------|-------|
| Apple Developer membership / agreements | **External** | Account must be active; paid apps agreement signed |
| `ascAppId` (numeric App Store Connect ID) | **Missing** | Required for EAS Submit / TestFlight metadata |
| Local EAS config commits | **HOLD** | `chore(eas): link EAS project ID` + Apple team ID exist locally only; do not push until Apple ready |
| TestFlight env / scope verification | **Pending** | Backend URL, API keys, OCR endpoint scope on device build |
| iOS release smoke | **Pending** | Full main-flow smoke on physical device / TestFlight build |

**Do not merge local `main` divergence (EAS + merge commits) into release PRs.** Branch new work from `origin/main`.

---

## 5. Remaining backlog

### In progress

| Item | Owner / PR | Priority |
|------|------------|----------|
| Feedback emoji removal, undo 5s, scanner audit | PR #20 (Claude) | P1 polish |

### Post-8.8 / separate tickets

| Item | Priority | Notes |
|------|----------|-------|
| Scanner / OCR back-exit guard | P2 | Audit in #20; implement separately if needed |
| Android JPG fullscreen zoom | P2 | Known gap vs PDF zoom |
| 16 KB native page-size warning | P2 | Android NDK / Play compliance watch |
| Xcode version sync | P2 | Align local + EAS image with App Store requirements |
| Branch cleanup | P3 | Remove stale branches (`fix/demo-document-trust-copy`, old feature branches) |
| API key rotation / git history hygiene | P3 | If any keys were ever committed; verify after #16 |
| Cloud backup opt-in | **Deferred 6 mo** | Product decision locked |
| Paddle OCR R&D | R&D | Training pipeline separate from 8.8 ship path |

---

## 6. Suggested next gates (after Apple unblocks)

1. Push local EAS commits (or cherry-pick onto clean branch from `origin/main`).
2. Set numeric `ascAppId` in App Store Connect + EAS config.
3. EAS iOS build → TestFlight internal.
4. Device smoke: onboarding → scan → OCR → detail → share → settings.
5. Backend env verification against TestFlight build scope.

---

## 7. Reference

- Release checklist: [`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md)
- Store readiness audits: [`docs/audits/2026-06-02-store-readiness-stabilization-index.md`](./audits/2026-06-02-store-readiness-stabilization-index.md)
- OCR backend plan: [`docs/backend/OCR_BACKEND_INTEGRATION_PLAN.md`](./backend/OCR_BACKEND_INTEGRATION_PLAN.md)
