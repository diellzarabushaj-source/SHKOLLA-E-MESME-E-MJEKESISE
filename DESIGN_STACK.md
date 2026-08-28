# DESIGN STACK — SHKOLLA E MESME E MJEKËSISË

## 1. SuperDesign
Source: https://github.com/superdesigndev/superdesign-skill

Primary project design-system source:
- `.superdesign/design-system.md`

Owns:
- typography
- spacing
- radii
- cards
- tables
- dashboard layout
- navigation
- responsive rules
- student / teacher / admin UI patterns

Project rule: preserve the existing palette and content.

## 2. Impeccable
Source: https://github.com/pbakaus/impeccable

Local project guidance:
- `.claude/skills/impeccable/SKILL.md`

Use after implementation for:
- audit
- critique
- polish
- accessibility
- responsive/mobile
- typography
- spacing
- hierarchy
- consistency

## 3. Stripe visual reference
Project reference:
- `design-md/stripe/DESIGN.md`

Use only for professional SaaS refinement:
- whitespace
- compact cards
- refined tables/forms
- subtle borders/shadows
- strong information hierarchy

Never import Stripe branding, copy, or colors.

## 4. Karpathy coding guidelines
Source: https://github.com/multica-ai/andrej-karpathy-skills

Local project guidance:
- `.claude/skills/karpathy-guidelines/SKILL.md`

Use for implementation discipline:
- think before coding
- simplicity first
- surgical changes
- goal-driven verification

## Project invariant

Design work may improve presentation, but must not silently change:
- educational content;
- existing color palette;
- behavior/business logic;
- routes/data contracts;
- authentication/progress semantics.
