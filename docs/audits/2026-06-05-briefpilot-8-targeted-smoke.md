# BriefPilot 8.0 — Targeted Reply Assistant P0 Smoke
**Date:** 2026-06-05
**Branch:** feature/ocr-api-integration
**Commit at test time:** 1515afffc
**Device:** iPhone (physical, iOS 26)

---

## Scope

Three targeted scenarios to close the Reply Assistant legal-safety P0 gate
after commit `1515afffc` (inferReplyCategory expansion + ScrollView scroll-to-top fix).

---

## Results

### 1. Düsseldorf Route — PASS

**Doc:** `demo-bussgeld-duesseldorf` (typ: Behörden / Amt, absender: Stadt Düsseldorf · Ordnungsamt)
**Path:** Dokument öffnen → Erledigen → Einspruch

| Criterion | Result |
|-----------|--------|
| Reply Assistant öffnet (nicht legacy Einspruch-Vorlage) | ✅ PASS |
| Kein Teilen-Button sichtbar | ✅ PASS |
| Entwurf kopieren-Button vorhanden | ✅ PASS |

### 2. High-Risk Amber — PASS

**Doc:** `demo-reply-bussgeld` (typ: Bußgeld)
**Path:** Einspruch → Vorlage `bussgeld_general_einspruch_005` (risk: high)

| Criterion | Result |
|-----------|--------|
| Amber-Warnung im FillStep sichtbar (oben) | ✅ PASS |
| Amber-Warnung im PreviewStep sichtbar (oben, nicht weggescrollt) | ✅ PASS |
| ScrollView beginnt beim Wechsel zu Preview bei y=0 | ✅ PASS |

### 3. Low-Risk Briefkopf — PASS

**Doc:** `demo-reply-schufa` (typ: Schufa)
**Path:** ⚙ Antwortentwurf erstellen → `schufa_selbstauskunft_001` → Felder ausfüllen → Preview

| Criterion | Result |
|-----------|--------|
| ABSENDER & EMPFÄNGER sichtbar | ✅ PASS |
| BETREFF sichtbar | ✅ PASS |
| INHALT sichtbar | ✅ PASS |
| Kein Senden / Teilen / Export | ✅ PASS |
| Kein Amber-Banner (low-risk, korrekt) | ✅ PASS |

**Note:** Gelbes DSGVO-Hinweisfeld sichtbar — das ist `safetyNote` des Templates (template-spezifischer Informationshinweis), kein High-Risk-Amber. Korrekt.

---

## Gate Status

| Gate | Status |
|------|--------|
| Reply Assistant legal-safety P0 | ✅ CLOSED |
| Legacy Einspruch-Vorlage route für Behörden/Amt | ✅ FIXED |
| Teilen in supported Einspruch-Akzeptanzpfad | ✅ ABSENT |
| High-risk amber rendering | ✅ VERIFIED |
| Low-risk Briefkopf rendering | ✅ VERIFIED |

---

## BriefPilot 8.0 Acceptance

**Final acceptance: YES**
**Known P0 blockers: none**
**Remaining scope: P1 polish / backlog only**

---

## Commits in this fix

| Hash | Beschreibung |
|------|-------------|
| `cda1114d0` | fix(ocr): keep upload entry visible after request errors |
| `08a51336c` | fix(ocr): auto-detect healthy backend in dev |
| `b0ef8a803` | chore(brand): sync Android native launcher icons |
| `c50f5421a` | fix(reply): clarify where to use copied draft |
| `38a470ea3` | chore(brand): use finalized icon in onboarding and auth |
| `1515afffc` | fix(reply): route Behörden/Amt docs to Reply Assistant + scroll to top |
