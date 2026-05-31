# BriefPilot — Release Candidate Checklist

## 1. Code Readiness

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `git status --short` → clean working tree
- [ ] `git log --oneline -n 5` → commit chain reviewed

## 2. Smoke Test — Main Flow

### Onboarding
- [ ] App opens without crash
- [ ] Onboarding screens load correctly
- [ ] "Demo ansehen" navigates to demo mode
- [ ] Demo documents visible, tappable

### Home
- [ ] Home loads with urgent banner (if urgent docs exist)
- [ ] Urgent count correct (erledigt docs excluded)
- [ ] Swipe-to-done on DokumentKarte works
- [ ] Long press document → selection mode activates
- [ ] Selection mode: main tab bar disappears, selection action bar appears at bottom
- [ ] Abbrechen → selection bar disappears, tab bar returns
- [ ] "Offene Hinweise" count reasonable (< 50% of documents)

### Detail — Analyse Tab
- [ ] AnalyseHeaderCard renders (status chip + confidence + Betrag/Frist)
- [ ] SmartSummaryCard visible
- [ ] Risk panel visible (if risk present)
- [ ] Nächster Schritt shows correct primary action

### Detail — Erledigen Tab
- [ ] Primary action card renders with correct tone (danger/success/primary/neutral)
- [ ] SCHNELLE AKTIONEN shows max 2 pills
- [ ] "Weitere Aktionen" section visible with inline rows (Exportieren / Angaben bearbeiten / Als erledigt markieren / Dokument löschen)
- [ ] No top-right "..." button visible in header
- [ ] No bottom sheet ("Mehr") opens from any source in Detail

### Detail — Dokument Tab
- [ ] Document preview section renders (or empty state)
- [ ] Core fields shown (Kategorie, Absender, Datum, Betrag, Frist)
- [ ] AI-extracted fields show ✦ sparkle
- [ ] Bearbeiten / Exportieren buttons visible
- [ ] "Dokument löschen" destructive link visible

### Erledigt Loop
- [ ] Tap "Erledigt ✅" pill → ErledigtModal opens
- [ ] Confirm → undo countdown (10s) appears
- [ ] "Rückgängig" undoes the action
- [ ] After close: Home urgent count decremented
- [ ] Erledigt doc no longer in Aktionen urgent list
- [ ] HomeUrgencyBanner not shown for erledigt docs

### Scanner
- [ ] Camera permission prompt shown on first launch
- [ ] Permission denied → friendly fallback screen with exit path
- [ ] Photo capture works
- [ ] Post-capture sheet (Analysieren / Galerie / etc.) opens
- [ ] Processing view shows (no infinite spinner)
- [ ] Analyse result navigates to Detail screen

### OCR Fallback
- [ ] Low confidence doc → `needs_review` status
- [ ] "Angaben prüfen" appears as primary action
- [ ] "Felder bearbeiten" opens edit flow

### Export
- [ ] Dokument Tab → Exportieren → Share sheet opens
- [ ] PDF renders without crash
- [ ] PDF contains correct document content

### Settings & Profile
- [ ] Einstellungen screen loads
- [ ] Profile screen accessible via `/profil` route
- [ ] Simple Mode toggle works (Detail shows only Özet tab)
- [ ] Language switch works (if exposed)

### PDF Signature (v1)
- [ ] Erledigen tab → PDF unterschreiben → signature pad opens
- [ ] Draw signature, place on page
- [ ] Save → signed PDF saved to document
- [ ] Unterschrift entfernen restores original

### Vorlesen
- [ ] Document with text → Vorlesen section visible (not "VORLESEN" all-caps)
- [ ] "Volltext anhören" plays audio
- [ ] "Kritische Punkte anhören" plays audio
- [ ] Tapping again stops playback

### Feedback
- [ ] Feedback modal opens (from Settings)
- [ ] Text input works
- [ ] Submit does not crash

## 3. Release Blocker List

Stop — do not submit to TestFlight if any of these are true:

- [ ] TypeScript errors present
- [ ] App crashes on launch
- [ ] Onboarding cannot be completed
- [ ] Demo mode documents not visible
- [ ] Camera permission denial has no exit path
- [ ] Scan results in infinite processing state
- [ ] Detail Analyse tab is empty
- [ ] Aktionen tab has no primary action
- [ ] Dokument tab crashes or shows nothing
- [ ] Erledigt marking does not update Home count
- [ ] PDF export crashes
- [ ] Feedback modal crashes on submit

## 4. TestFlight Build

```bash
# Verify clean state
git status --short
npx tsc --noEmit

# Build
eas build --platform ios --profile testflight

# Submit (after build completes)
eas submit --platform ios --profile testflight
```

## 5. App Store Connect / TestFlight Content

### What to Test (Beta)
```
Bitte teste den Hauptablauf:
1. Öffne die App
2. Nutze "Demo ansehen" oder scanne ein eigenes Dokument
3. Prüfe Analyse, Aktionen und Dokument-Tab
4. Markiere ein Dokument als erledigt
5. Teste PDF-Export
6. Sende Feedback über "Feedback senden"

Wichtig: BriefPilot ist eine Beta und ersetzt keine Rechtsberatung.
```

### Required Fields
- [ ] Beta description written
- [ ] Privacy Policy URL set
- [ ] Support URL set
- [ ] Camera permission text (NSCameraUsageDescription) localized (DE/TR/EN)
- [ ] No legal advice disclaimer visible in Einspruch flow
- [ ] Demo mode note in onboarding or App Store description

## 6. Release Track

- [ ] Internal testers (dev + QA) — build verified
- [ ] External beta — 100 testers
- [ ] App Store submission — after external beta feedback
