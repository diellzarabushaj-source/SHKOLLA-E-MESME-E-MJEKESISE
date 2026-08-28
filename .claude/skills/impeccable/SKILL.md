---
name: impeccable
description: Project-local frontend audit and polish guidance for Shkolla e Mesme e Mjekësisë. Inspired by pbakaus/impeccable.
source: https://github.com/pbakaus/impeccable
---

# Impeccable — project rules

Use after implementation, never as permission for a hidden redesign.

## Preserve
- all user-facing educational content;
- the exact existing light/dark palette;
- routes, logic, data behavior, auth, progress, and roles;
- the incumbent medical-school visual identity.

## Audit in this order
1. Accessibility: keyboard, focus, semantics, contrast, touch targets.
2. Responsive: 320/360/390/768/1024/1440 widths, no page overflow.
3. Typography: font loading, hierarchy, measure, line-height, Albanian characters, numeric alignment.
4. Layout: spacing rhythm, grouping, alignment, density.
5. Components: cards, tables, forms, navigation, dashboard consistency.
6. Performance: avoid layout-heavy animation, excessive blur/shadows, unnecessary client code.
7. Visual polish: subtle borders/shadows/states using existing tokens only.

## Typography pass
- Use the project Inter variable font.
- Keep lesson text calm and readable.
- Use tabular numerals for analytics.
- Avoid too many font weights in one surface.
- Do not shrink important text to solve layout issues.

## Polish pass
- refine, do not replace;
- fix the narrowest correct cause;
- prefer project tokens/patterns;
- preserve visible focus and reduced-motion behavior;
- verify desktop, tablet, and mobile;
- run CI after changes.

A clean detector/build is not enough: inspect hierarchy and readability as well.
