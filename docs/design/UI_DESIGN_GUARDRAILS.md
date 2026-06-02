# UI Design Guardrails

## Purpose
This file defines the visual and interaction guardrails for BriefPilot mobile UI work.

The product target is:
- calm
- serious
- legible
- trustworthy
- operationally clear

The product is not:
- playful
- flashy
- gamified
- trend-driven
- visually noisy

## Core Principle
Every screen should feel like a quiet, high-trust tool for handling important documents.

If a design choice increases visual excitement but reduces clarity, trust, or calmness, reject it.

## Visual Direction
BriefPilot should follow a quiet-luxury utility style:
- restrained
- precise
- premium without ornament
- warm but not cute
- modern but not startup-loud

Target feeling:
- “serious assistant for important paperwork”
- not “social app”
- not “consumer finance gimmick”
- not “AI toy”

## Typography
- Prefer clean, stable hierarchy over expressive typography.
- Large type should communicate structure, not personality.
- Avoid overly playful, rounded, cartoonish, or decorative font treatments.
- Use weight and spacing sparingly.
- Do not rely on excessive all-caps for drama.
- Body text must remain easy to scan in long document flows.

Rules:
- Titles must be short and calm.
- Section labels should help orientation, not dominate the screen.
- Avoid too many font sizes on one surface.
- If a surface feels busy, reduce typography variation first.

## Color
- Use color as a status signal, not decoration.
- Prefer muted, controlled palettes.
- Avoid loud gradients, neon accents, saturated purple bias, or “AI glow” aesthetics.
- Warning and danger colors should feel official and clear, not theatrical.
- Backgrounds should stay quiet enough for document content to remain primary.

Rules:
- Primary accent should guide action, not flood the screen.
- Yellow/orange warning states must not overtake the whole experience.
- Green should signal completion or safety, not celebration.
- Red should be reserved for real risk, destructive actions, and important deadlines.

## Spacing and Density
- Favor breathable layouts with deliberate grouping.
- Do not compress critical document actions into cramped clusters.
- Keep related controls visually grouped.
- Avoid large empty hero spaces if they push important actions below the fold.

Rules:
- First screenful must show meaningful status or next action.
- Sheets must not hide the primary decision behind scrolling unless the content is genuinely long.
- Repetition of similar cards should be visually compact and structured.

## Components
- Components must feel related across the app.
- Prefer stable primitives over one-off stylized widgets.
- If a new component introduces a new visual language, it is probably wrong.

Rules:
- Cards should differ by meaning, not by arbitrary styling experiments.
- Buttons should feel predictable and reusable.
- Icons should support meaning, not decorate whitespace.
- Sheets and modals should look like part of the same product family.

## Motion
- Motion should reduce discontinuity, not draw attention.
- Transitions should feel soft, fast, and intentional.
- Avoid bouncy, playful, or “showcase” motion.

Rules:
- Use animation to preserve context between states.
- Motion should help users understand what changed.
- If animation makes a critical flow feel slower or less stable, remove it.

## Document-First Hierarchy
The document and its next step are the center of the product.

Rules:
- Keep the document identity clear.
- Keep sender, type, deadline, amount, and next action easy to find.
- Generated AI text must never visually overpower structured document facts.
- Review states should not make the entire UI feel alarmist.

## AI Presentation
AI should feel useful and restrained.

Rules:
- Do not present AI like a character.
- Avoid chat-app metaphors unless the surface is explicitly a chat workflow.
- Avoid hype language like “magic”, “smartest”, “revolutionary”, unless already justified in a very narrow feature context.
- AI summaries should read like operational help, not marketing copy.

## Warnings and Risk Surfaces
Risk UI must feel credible, not sensational.

Rules:
- Use strong color only when the underlying logic is strong.
- Avoid turning low-confidence or generic uncertainty into dramatic visual treatment.
- If a risk panel is visually louder than the evidence behind it, tone it down.

## Empty States
Empty states should be useful and quiet.

Rules:
- Give one clear next step.
- Avoid jokes, mascots, or excessive encouragement.
- Keep empty states shorter than marketing pages.

## Sheets and Modals
- Sheets should support decisions, not create friction.
- Modal copy must be short and operational.
- Avoid stacking too many tonal layers inside one sheet.

Rules:
- One primary action, one secondary action, clear hierarchy.
- Long sheets must scroll safely.
- Destructive confirmation should be explicit but not melodramatic.

## Lists and Dashboards
- Overview screens should reduce stress, not amplify it.
- Counts, badges, and warnings must remain proportional.
- Dashboards should summarize, not shout.

Rules:
- Do not inflate visual urgency through color alone.
- Avoid too many simultaneous emphasis points.
- If every card looks important, none of them are.

## Copy Tone
UI copy should sound:
- calm
- direct
- competent
- non-promotional

Avoid:
- cheerleading
- exclamation-heavy language
- cutesy phrasing
- generic AI hype

Preferred tone:
- “Here is the status.”
- “Here is the next step.”
- “Here is the risk.”

## Anti-Patterns
Do not introduce:
- glossy startup gradients
- oversized hero marketing sections inside utilitarian flows
- badge overload
- random accent colors per feature
- novelty UI that competes with document readability
- decorative icons without semantic value
- mixed visual metaphors across adjacent screens

## Decision Filter
Before shipping a UI change, ask:
1. Does this make the next action clearer?
2. Does this increase calmness and trust?
3. Does this preserve document readability?
4. Does this align with the rest of the product?
5. Would this still feel correct for a tax letter, invoice, court note, or insurance document?

If the answer to any of these is “no”, revise before shipping.

## Implementation Rule
When design choices are ambiguous:
- prefer simpler
- prefer quieter
- prefer clearer
- prefer more consistent

BriefPilot should feel like a premium operations tool for paperwork, not a feature showroom.
