# Annotation stability v4

This pass focuses on making the contextual highlighting and sticky-note controls feel fixed, predictable and touch-safe.

- Locks selection capture while the toolbar is being pressed.
- Cancels stale selection timers before a toolbar interaction.
- Delays release briefly so click/tap handlers complete before native selection changes can interfere.
- Suppresses sub-pixel toolbar repositioning to remove visible micro-jitter.
- Avoids redundant React selection state updates for the same selection geometry.
- Uses non-moving hover/active states and opacity-only entrance motion.
- Increases coarse-pointer tap targets and improves narrow-phone layout.
- Adds E2E coverage for pointer-down and pointer-cancel geometry stability.
