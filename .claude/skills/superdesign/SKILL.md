---
name: superdesign
description: Project-local design-system guidance for Shkolla e Mesme e Mjekësisë. Source inspiration: superdesigndev/superdesign-skill.
source: https://github.com/superdesigndev/superdesign-skill
---

# SuperDesign — project rules

Before frontend design work, read:
- `.superdesign/design-system.md`
- `design-md/stripe/DESIGN.md` when SaaS polish is relevant.

## Authority
`.superdesign/design-system.md` is the primary design-system source for this project.

## Preserve
- current dark/light palette exactly;
- all educational and user-facing content;
- routes, data contracts, learning logic, progress logic, authentication, and roles.

## Design scope
Improve:
- typography;
- spacing and alignment;
- border radius;
- cards;
- tables/forms;
- dashboard composition;
- navigation;
- responsive behavior;
- student/teacher/admin patterns.

## Quality bar
The result should feel more precise, calm, readable, and professional without looking like a different product.

After implementation, use the local Impeccable guidance for audit and polish, then run the project CI suite before merge.
