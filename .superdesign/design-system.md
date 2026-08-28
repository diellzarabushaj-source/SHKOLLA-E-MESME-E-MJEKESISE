# Shkolla e Mesme e Mjekësisë — Design System

Source of truth for UI refinement. This document preserves the incumbent product identity.

## Non-negotiable invariants

- Do not rewrite, remove, add, summarize, or reorder educational content as part of design work.
- Do not change the current light/dark palette. Existing color tokens in `app/globals.css` are authoritative.
- Do not change routes, data contracts, learning logic, progress logic, authentication behavior, or role permissions for visual polish.
- Design changes must remain accessible, responsive, fast, and testable.
- Prefer refinement over redesign: improve hierarchy, typography, spacing, density, alignment, borders, shadows, states, and responsive behavior.
- Stripe is visual inspiration only; never add Stripe wording, branding, colors, assets, or product copy.

## Current color system — frozen

Dark:
- background `#07111f`
- soft background `#0a1626`
- panel `#0d1b2d`
- panel 2 `#12243a`
- card `#10233b`
- text `#f7fbff`
- muted `#9dafc4`
- muted 2 `#70849d`
- primary `#3654ff`
- primary strong `#2743eb`
- accent `#67d6e7`
- success `#43c596`
- warning `#f1b947`
- danger `#ff5f87`

Light:
- background `#f4f7fc`
- soft background `#edf2fa`
- panel/card `#ffffff`
- panel 2 `#eef3fb`
- text `#10213a`
- muted `#5c6f88`
- muted 2 `#8290a4`
- primary `#3154f5`
- primary strong `#2446d8`
- accent `#087f9c`
- success `#168a63`
- warning `#a86b00`
- danger `#c92c5c`

Use these through existing CSS variables. Never introduce a replacement brand palette.

## Typography

Primary family: **Inter Variable**, self-hosted by Next.js through `next/font`.

Goals:
- excellent Albanian readability, including Ë/ë and Ç/ç;
- professional medical/SaaS appearance;
- compact UI without feeling compressed;
- clear distinction between learning content, controls, and analytics.

Rules:
- Display/hero: 750–900 weight, tight tracking (`-0.02em` to `-0.055em`), balanced wrapping.
- Section heading: 720–850, line-height 1.08–1.2.
- Card heading: 700–800, line-height 1.2–1.35.
- Body/lesson text: 400–550, line-height 1.65–1.82, ideal measure 60–68ch.
- UI labels: 650–800; uppercase only for short metadata labels.
- Buttons: 700–800; avoid excessive 900+ weight unless the control is primary.
- Dashboard values: tabular lining numerals for stable alignment.
- Tables: 450–650 body, 700 header, tabular numerals for numeric columns.
- Never reduce learning body text below 15.5px on mobile.
- Never use more than three visually distinct text weights in one small card.

## Spacing

Base rhythm: 4px.

Preferred scale:
- 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px.
- Related items: 8–16px.
- Card internal sections: 16–24px.
- Card-to-card gap: 12–20px.
- Major section separation: 64–100px desktop; 44–72px mobile.
- Avoid arbitrary spacing when a nearby scale value works.

## Border radius

- small control: 10–12px
- input/button: 12–14px
- compact card: 16–20px
- major card/panel: 20–26px
- hero surface: 26–30px
- pill/badge: 999px

Use radius to express hierarchy. Do not make every surface equally rounded.

## Cards

- One clear heading and one primary purpose per card.
- Prefer 1px token border + subtle token-derived shadow.
- Avoid multiple nested bordered cards unless they express real hierarchy.
- Hover movement: maximum 1–3px for ordinary cards.
- Interactive cards need visible hover, keyboard focus, and active states.
- Dense dashboard cards should be shorter and tighter than learning cards.

## Tables

- Keep headers clearly distinct through weight, spacing, and existing theme surfaces.
- Numeric values use tabular numerals.
- Keep row height compact but touch-friendly where rows are interactive.
- Horizontal scroll is allowed for complex medical tables on narrow screens; the page itself must not overflow.
- Captions and table context must remain visible and semantically connected.

## Dashboard layout

Desktop:
- wide shell with strong hierarchy;
- KPI row first;
- primary insight/plan before secondary analytics;
- consistent card radius and padding;
- compact labels, prominent values;
- no decorative chart chrome that competes with data.

Tablet:
- collapse KPI density before reducing type too far;
- 2-column analytical cards when space allows.

Mobile:
- single-column reading order;
- key values visible without horizontal scrolling;
- targets at least 44px;
- maintain meaningful whitespace around high-information cards.

## Navigation

- Header remains calm and compact.
- Current location must be visually clear.
- Mobile navigation must remain reachable with one hand and avoid viewport overflow.
- Do not add extra navigation destinations during visual work.
- Preserve route semantics and existing labels.

## Forms

- Labels always remain legible and close to their fields.
- Inputs and buttons share consistent control height.
- Error/success state should rely on existing semantic tokens plus text/icon semantics.
- Do not use placeholder text as the only label.
- Keep authentication surfaces visually focused; avoid unrelated decoration.

## Student UI

Priority:
1. what am I learning now?
2. where am I in the hierarchy?
3. what should I do next?
4. how am I progressing?

Learning content must feel calmer and more readable than analytics/admin surfaces.

## Teacher UI

If/when teacher-specific surfaces exist:
- prioritize overview, class/lesson context, review queues, and student progress;
- keep batch actions obvious and reversible;
- dense data is acceptable when grouping and hierarchy remain clear.

## Admin UI

- prioritize correctness, editing context, save state, and recovery.
- controls may be denser than student UI but must retain 44px touch targets on mobile.
- destructive actions require clear separation from primary save actions.
- tables/editors should optimize scanning and data integrity over decorative visuals.

## Responsive rules

- no horizontal page overflow at 320, 360, 390, 768, 1024, 1280, and 1440px.
- do not solve overflow by globally hiding content.
- use fluid `clamp()`, `minmax()`, wrapping, and layout collapse.
- test long Albanian labels and large text zoom.
- preserve `prefers-reduced-motion` behavior.

## Quality sequence

1. Build with this design system.
2. Verify content, routes, and colors are unchanged.
3. Run responsive/browser/TypeScript/build audits.
4. Apply an Impeccable-style audit and polish pass.
5. Re-run the full CI suite before merge.
