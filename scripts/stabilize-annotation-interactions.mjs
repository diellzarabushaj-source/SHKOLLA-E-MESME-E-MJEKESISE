import { readFileSync, writeFileSync } from "node:fs";

const file = "app/LessonAnnotations.tsx";
let source = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
const marker = "annotation-stability-v4";

if (source.includes(marker)) {
  console.log("Annotation interaction stability v4 already installed.");
  process.exit(0);
}

if (!source.includes("annotation-experience-v3")) {
  throw new Error("Annotation stability v4 must run after annotation experience v3.");
}

function swap(label, find, replacement) {
  if (!source.includes(find)) throw new Error(`${label}: pattern missing`);
  source = source.replace(find, replacement);
}

swap(
  "feature marker",
  `// annotation-experience-v3`,
  `// annotation-experience-v3\n// ${marker}`,
);

swap(
  "stability constants",
  `const TOOLBAR_SELECTION_GAP = 10;`,
  `const TOOLBAR_SELECTION_GAP = 10;\nconst TOOLBAR_POSITION_EPSILON = 1.75;\nconst TOOLBAR_INTERACTION_RELEASE_MS = 140;`,
);

swap(
  "interaction refs",
  `  const selectionRangeRef = useRef<Range | null>(null);\n  const toolbarRef = useRef<HTMLDivElement>(null);`,
  `  const selectionRangeRef = useRef<Range | null>(null);\n  const toolbarInteractionRef = useRef(false);\n  const toolbarReleaseTimerRef = useRef<number | null>(null);\n  const toolbarRef = useRef<HTMLDivElement>(null);`,
);

swap(
  "lesson reset interaction state",
  `  useEffect(() => {\n    loadRequestRef.current += 1;\n    selectionRangeRef.current = null;`,
  `  useEffect(() => {\n    loadRequestRef.current += 1;\n    selectionRangeRef.current = null;\n    toolbarInteractionRef.current = false;\n    if (toolbarReleaseTimerRef.current !== null) {\n      window.clearTimeout(toolbarReleaseTimerRef.current);\n      toolbarReleaseTimerRef.current = null;\n    }`,
);

swap(
  "capture guard",
  `  const captureSelection = useCallback(() => {\n    if (!enabled || busy || composerOpen) return;`,
  `  const captureSelection = useCallback(() => {\n    if (!enabled || busy || composerOpen || toolbarInteractionRef.current) return;`,
);

swap(
  "stable selection state",
  `    const rect = range.getBoundingClientRect();\n    const position = selectionToolbarPosition(rect);\n    selectionRangeRef.current = range.cloneRange();\n    setNotice("");\n    setSelection({\n      blockKey: startBlock.dataset.annotationBlockKey as string,\n      startOffset,\n      endOffset,\n      quote,\n      prefix: blockText.slice(Math.max(0, startOffset - 64), startOffset),\n      suffix: blockText.slice(endOffset, endOffset + 64),\n      left: position.left,\n      top: position.top,\n      placement: position.placement,\n    });`,
  `    const rect = range.getBoundingClientRect();\n    const position = selectionToolbarPosition(rect);\n    const nextSelection: SelectionDraft = {\n      blockKey: startBlock.dataset.annotationBlockKey as string,\n      startOffset,\n      endOffset,\n      quote,\n      prefix: blockText.slice(Math.max(0, startOffset - 64), startOffset),\n      suffix: blockText.slice(endOffset, endOffset + 64),\n      left: position.left,\n      top: position.top,\n      placement: position.placement,\n    };\n    selectionRangeRef.current = range.cloneRange();\n    setNotice("");\n    setSelection((current) => {\n      if (\n        current\n        && current.blockKey === nextSelection.blockKey\n        && current.startOffset === nextSelection.startOffset\n        && current.endOffset === nextSelection.endOffset\n        && current.quote === nextSelection.quote\n        && current.placement === nextSelection.placement\n        && Math.abs(current.left - nextSelection.left) < TOOLBAR_POSITION_EPSILON\n        && Math.abs(current.top - nextSelection.top) < TOOLBAR_POSITION_EPSILON\n      ) return current;\n      return nextSelection;\n    });`,
);

swap(
  "selection schedule interaction lock",
  `    const schedule = (event?: Event) => {\n      const target = event?.target instanceof Element ? event.target : null;\n      if (target?.closest("[data-annotation-ui]")) return;`,
  `    const schedule = (event?: Event) => {\n      if (toolbarInteractionRef.current) return;\n      const target = event?.target instanceof Element ? event.target : null;\n      if (target?.closest("[data-annotation-ui]")) return;`,
);

swap(
  "reposition epsilon",
  `        Math.abs(current.left - position.left) < 0.75\n        && Math.abs(current.top - position.top) < 0.75`,
  `        Math.abs(current.left - position.left) < TOOLBAR_POSITION_EPSILON\n        && Math.abs(current.top - position.top) < TOOLBAR_POSITION_EPSILON`,
);

swap(
  "toolbar interaction helpers",
  `  function clearSelection() {\n    window.getSelection()?.removeAllRanges();\n    selectionRangeRef.current = null;\n    setSelection(null);\n  }`,
  `  const beginToolbarInteraction = useCallback(() => {\n    if (toolbarReleaseTimerRef.current !== null) {\n      window.clearTimeout(toolbarReleaseTimerRef.current);\n      toolbarReleaseTimerRef.current = null;\n    }\n    toolbarInteractionRef.current = true;\n    if (selectionTimerRef.current !== null) {\n      window.clearTimeout(selectionTimerRef.current);\n      selectionTimerRef.current = null;\n    }\n  }, []);\n\n  const endToolbarInteraction = useCallback(() => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n    toolbarReleaseTimerRef.current = window.setTimeout(() => {\n      toolbarInteractionRef.current = false;\n      toolbarReleaseTimerRef.current = null;\n    }, TOOLBAR_INTERACTION_RELEASE_MS);\n  }, []);\n\n  useEffect(() => () => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n  }, []);\n\n  function clearSelection() {\n    toolbarInteractionRef.current = false;\n    if (toolbarReleaseTimerRef.current !== null) {\n      window.clearTimeout(toolbarReleaseTimerRef.current);\n      toolbarReleaseTimerRef.current = null;\n    }\n    window.getSelection()?.removeAllRanges();\n    selectionRangeRef.current = null;\n    setSelection(null);\n  }`,
);

swap(
  "stable toolbar pointer handlers",
  `          role="toolbar" aria-label="Veglat e tekstit të zgjedhur"\n          onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}>`,
  `          role="toolbar" aria-label="Veglat e tekstit të zgjedhur"\n          onPointerDown={(event) => {\n            beginToolbarInteraction();\n            event.preventDefault();\n            event.stopPropagation();\n          }}\n          onPointerUp={(event) => {\n            event.stopPropagation();\n            endToolbarInteraction();\n          }}\n          onPointerCancel={() => endToolbarInteraction()}>`,
);

writeFileSync(file, source);
console.log("Installed annotation stability v4: interaction lock, micro-jitter suppression and stable pointer handling.");
