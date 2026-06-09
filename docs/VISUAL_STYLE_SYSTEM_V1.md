# BriefPilot — Visual Style System V1

> Reference document for release UI. When in doubt about icon size, font size, color usage, or emoji, check here first.

---

## 1. Purpose

BriefPilot should feel **calm, trustworthy, professional, and useful.**

Not playful. Not an AI cockpit. Not a noisy dashboard.

Every visual decision — icon weight, font size, color choice, spacing — either reinforces this or erodes it. This document locks the baseline so drift stops.

---

## 2. Emoji Policy

### Rule: No emoji in public UI.

| Surface | Emoji allowed? |
|---|---|
| Home screen | No |
| Detail → Aktionen tab | No |
| Detail → Analyse tab | No |
| Detail → Dokument tab | No |
| More Tools sheet | No |
| Scanner / Camera | No |
| Feedback / Settings | No |
| Premium sheet | No |
| Onboarding | Legacy — migrate separately |
| Chat / AI chips | Legacy — migrate separately |
| Internal dev logs / console | Yes |
| Code comments / docs | Yes |

### Replacement: always `<Icon name="..." />` from the Phosphor system.

### Why: emoji render size, weight, and baseline vary by OS and device. Line icons are consistent, scalable, and semantically controllable.

---

## 3. Icon Family

**Single source: Phosphor.**

- Entry point: `src/components/Icon/phosphorMap.ts`
- Import `Icon` from `@/components/Icon`
- Do **not** import from `phosphor-react-native` directly in feature components
- Do **not** add Lucide, FontAwesome, or any other icon library
- Do **not** use SF Symbols or Material Icons directly

### Adding new icons:
1. Check `phosphorMap.ts` — alias may already exist
2. If missing: add import + alias to `phosphorMap.ts`, PR title `feat(icons): add X alias`
3. Use semantic alias names (`calendar-blank`, not `CalendarBlank`)

---

## 4. Icon Size Tokens

### Proposed semantic scale:

| Token | Size | Use |
|---|---|---|
| `icon.xs` | 12 | Badge decoration, inline helper |
| `icon.sm` | 16 | Field prefix, metadata row |
| `icon.md` | 20 | Standard row icon, header decoration |
| `icon.row` | 22 | List/action row leading icon |
| `icon.action` | 22 | Button icon, quick action pill |
| `icon.card` | 24 | Section header, card leading icon |
| `icon.hero` | 32 | Empty state, onboarding illustration |
| `icon.tabInactive` | 20 | Tab bar (unfocused) |
| `icon.tabActive` | 22 | Tab bar (focused) |

### Critical rule:
> **Line icons look optically smaller than emoji at the same size.**  
> Do not use sizes below 20 in rows, action buttons, or anywhere a user needs to recognize the icon at a glance.  
> `size=14`, `size=16` only for decorative or very small metadata contexts.

### Current problem to fix:
`SmartActionsPanel` and `SmartRemindersPanel` currently use `size=18` — these feel thin. Migrate to `icon.row = 22`.

---

## 5. Font Scale

### Proposed scale:

| Token | Size | Use |
|---|---|---|
| `font.micro` | 10 | Eyebrow label, ALL CAPS section header |
| `font.xs` | 11 | Caption, badge text, timestamp |
| `font.sm` | 12 | Label, secondary text, button small |
| `font.section` | 13 | Section subtext, helper description |
| `font.body` | 14 | Primary body text |
| `font.bodyLarge` | 15 | Emphasised body, row label |
| `font.title` | 18 | Card title, sheet header |
| `font.screenTitle` | 24 | Screen title, modal heading |
| `font.hero` | 32 | Display, empty state, onboarding |

### Rules:
- No new random `fontSize` values. If you need something not in this scale, justify it.
- `11px` maps to `font.xs` — not a free-floating value.
- `13px` maps to `font.section` — subtext/description use only.
- Do **not** use `fontSize: 9` in release surfaces.
- `fs()` helper or direct token where available.

### Current state:
31 distinct fontSize values in the codebase. Design token defines 6. This doc defines 9. Target: collapse everything to these 9 values in release-facing surfaces.

---

## 6. Color Semantics

### Semantic rules:

| Color role | Token | When to use |
|---|---|---|
| Primary action | `C.primary` | Helpful, constructive, neutral next-step |
| Danger | `C.danger` | Today/overdue/critical/destructive only |
| Warning | `C.warning` | Caution — notable but not panic |
| Success | `C.success` | Done, completed, confirmed |
| Neutral | `C.bgInput`, `C.border` | Metadata, inactive, secondary |
| Text | `C.text` / `C.textSecondary` / `C.textTertiary` | Hierarchy |

### Specific rules:

**Reminder `+ Setzen` button:**
- `suggestion.dringend` is `true` AND deadline is today or overdue → `C.danger`
- Everything else → `C.primary`
- Rationale: setting a reminder is a helpful action, not a danger action. Red creates unnecessary anxiety.

**`#fff` hardcoding:**
- On `C.primary`/`C.danger` backgrounds: `'#fff'` acceptable for text/icon contrast
- As background color: use `C.bgCard` or `C.bgInput` instead
- Do not use `#fff` where a semantic token exists

**Avoid:**
- Hardcoded hex that duplicates a theme token (`#4361EE` instead of `C.primary`)
- Ad-hoc rgba overlays — add to theme if needed more than once

---

## 7. Component Rules

### Home
- Max 3–4 primary content surfaces
- No emoji in document cards or list rows
- Document type icon: system icon, not emoji map

### Aktionen tab
- One primary action card (large, clear)
- Max two quick action pills
- Erinnerungen section: calm, readable — not alarm-style
- `+ Setzen` button: primary blue unless critical deadline

### Analyse tab
- Explain, do not overwhelm
- Risk scores: clear severity color, not noisy
- Summary bullets: no leading emoji (strip at display time if AI-generated)

### Dokument tab
- Document preview, field list, edit/export actions
- TYP_EMOJI map → system icons
- Field icons (`📅`, `💶`, `📄`) → `calendar-blank`, `currency-eur`, `document-text`
- OCR debug / technical panels: collapsed by default

### More Tools sheet
- Secondary/tertiary tools only
- No duplicate close button
- No tool count in button label

---

## 8. Migration Order

Work in this order. Do not skip ahead to `P2` while `P0` is incomplete.

| Priority | Work item | Target files |
|---|---|---|
| **P0** | Dokument tab emoji cleanup | `HeroCard.tsx`, `DetailsPanel.tsx`, `buildSmartFieldRows.ts` |
| **P0** | Icon size normalization | `SmartActionsPanel.tsx`, `SmartRemindersPanel.tsx` |
| **P0** | Reminder button tone | `SmartRemindersPanel.tsx` |
| **P1** | Remaining release emoji sweep | `SmartRiskPanel.tsx`, `SmartTimelinePanel.tsx`, `GlobalFAB.tsx`, `V4JobStatusRibbon.tsx`, `ContextualGuidance.tsx` |
| **P1** | `›` / `→` / `⋯` symbol characters | `AnalyseHeaderCard.tsx`, `ActionsPanel.tsx`, `BelgeAciklamaModal.tsx` and 6 others |
| **P2** | Font scale collapse | All release-facing `.tsx` — gradual |
| **P2** | Spacing token adoption | All release-facing `.tsx` — gradual |
| **P3** | Onboarding emoji | `OnboardingScreen.tsx`, `OnboardingModalView.tsx` |
| **P3** | Chat / AI chips emoji | Separately scoped |

---

## 9. Do Not Do

| Action | Reason |
|---|---|
| New features | Post-TestFlight |
| New icon library (Lucide, etc.) | Phosphor is the single source |
| Global font-size rewrite in one PR | Too risky, no clear diff |
| Automatic dark mode | Not tested end-to-end |
| Broad design-system refactor | Before TestFlight: stability > perfection |
| Removing Phosphor for another system | Already invested, works well |

---

## 10. Quick Reference Cheat Sheet

```
Icon sizes:    xs=12  sm=16  md=20  row=22  action=22  card=24  hero=32
Font sizes:    micro=10  xs=11  sm=12  section=13  body=14  bodyLg=15  title=18  screen=24  hero=32
Colors:        primary=helpful  danger=today/overdue/destructive  warning=caution  success=done
Emoji:         never in release UI surfaces
Phosphor:      single icon source, import via @/components/Icon
```

---

*Last updated: 2026-05-02 — fix/release-audit-findings branch*
