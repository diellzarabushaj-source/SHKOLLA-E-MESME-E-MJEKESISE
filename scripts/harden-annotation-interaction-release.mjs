import { readFileSync, writeFileSync } from "node:fs";

const file = "app/LessonAnnotations.tsx";
let source = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
const marker = "annotation-stability-v5";

if (source.includes(marker)) {
  console.log("Annotation interaction stability v5 already installed.");
  process.exit(0);
}

if (!source.includes("annotation-stability-v4")) {
  throw new Error("Annotation stability v5 must run after annotation stability v4.");
}

function swap(label, find, replacement) {
  if (!source.includes(find)) throw new Error(`${label}: pattern missing`);
  source = source.replace(find, replacement);
}

swap(
  "feature marker",
  `// annotation-stability-v4`,
  `// annotation-stability-v4\n// ${marker}`,
);

swap(
  "pending selection ref",
  `  const toolbarInteractionRef = useRef(false);\n  const toolbarReleaseTimerRef = useRef<number | null>(null);`,
  `  const toolbarInteractionRef = useRef(false);\n  const toolbarReleaseTimerRef = useRef<number | null>(null);\n  const pendingSelectionRecheckRef = useRef(false);`,
);

swap(
  "lesson reset pending state",
  `    toolbarInteractionRef.current = false;\n    if (toolbarReleaseTimerRef.current !== null) {`,
  `    toolbarInteractionRef.current = false;\n    pendingSelectionRecheckRef.current = false;\n    if (toolbarReleaseTimerRef.current !== null) {`,
);

swap(
  "selection schedule remembers blocked changes",
  `    const schedule = (event?: Event) => {\n      if (toolbarInteractionRef.current) return;\n      const target = event?.target instanceof Element ? event.target : null;`,
  `    const schedule = (event?: Event) => {\n      if (toolbarInteractionRef.current) {\n        if (event?.type === "selectionchange") pendingSelectionRecheckRef.current = true;\n        return;\n      }\n      const target = event?.target instanceof Element ? event.target : null;`,
);

swap(
  "release lifecycle and conditional selection recovery",
  `  const endToolbarInteraction = useCallback(() => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n    toolbarReleaseTimerRef.current = window.setTimeout(() => {\n      toolbarInteractionRef.current = false;\n      toolbarReleaseTimerRef.current = null;\n    }, TOOLBAR_INTERACTION_RELEASE_MS);\n  }, []);\n\n  useEffect(() => () => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n  }, []);`,
  `  const scheduleSelectionRecheck = useCallback(() => {\n    window.requestAnimationFrame(() => {\n      const activeSelection = window.getSelection();\n      if (!activeSelection || activeSelection.isCollapsed || activeSelection.rangeCount === 0) return;\n      document.dispatchEvent(new Event("selectionchange"));\n    });\n  }, []);\n\n  const endToolbarInteraction = useCallback(() => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n    toolbarReleaseTimerRef.current = window.setTimeout(() => {\n      toolbarInteractionRef.current = false;\n      toolbarReleaseTimerRef.current = null;\n      const shouldRecheckSelection = pendingSelectionRecheckRef.current;\n      pendingSelectionRecheckRef.current = false;\n      if (shouldRecheckSelection) scheduleSelectionRecheck();\n    }, TOOLBAR_INTERACTION_RELEASE_MS);\n  }, [scheduleSelectionRecheck]);\n\n  useEffect(() => {\n    const releaseInteraction = () => {\n      if (toolbarInteractionRef.current) endToolbarInteraction();\n    };\n    const releaseWhenHidden = () => {\n      if (document.visibilityState !== "visible") releaseInteraction();\n    };\n\n    document.addEventListener("pointerup", releaseInteraction, true);\n    document.addEventListener("pointercancel", releaseInteraction, true);\n    document.addEventListener("visibilitychange", releaseWhenHidden);\n    window.addEventListener("blur", releaseInteraction);\n\n    return () => {\n      document.removeEventListener("pointerup", releaseInteraction, true);\n      document.removeEventListener("pointercancel", releaseInteraction, true);\n      document.removeEventListener("visibilitychange", releaseWhenHidden);\n      window.removeEventListener("blur", releaseInteraction);\n      if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n    };\n  }, [endToolbarInteraction]);`,
);

swap(
  "clear pending interaction state",
  `  function clearSelection() {\n    toolbarInteractionRef.current = false;`,
  `  function clearSelection() {\n    toolbarInteractionRef.current = false;\n    pendingSelectionRecheckRef.current = false;`,
);

swap(
  "invalidate loads before create",
  `  async function createAnnotation(kind: AnnotationKind, color: AnnotationColor, text: string | null) {\n    if (!selection) return;\n    setBusy(true);`,
  `  async function createAnnotation(kind: AnnotationKind, color: AnnotationColor, text: string | null) {\n    if (!selection) return;\n    loadRequestRef.current += 1;\n    setBusy(true);`,
);

swap(
  "invalidate loads before update",
  `  async function updateAnnotation(annotation: LessonAnnotation, changes: { color?: AnnotationColor; noteText?: string }) {\n    setBusy(true);`,
  `  async function updateAnnotation(annotation: LessonAnnotation, changes: { color?: AnnotationColor; noteText?: string }) {\n    loadRequestRef.current += 1;\n    setBusy(true);`,
);

swap(
  "invalidate loads before delete",
  `  async function removeAnnotation(annotation: LessonAnnotation) {\n    if (!window.confirm(annotation.kind === "note" ? "Të fshihet ky sticky note?" : "Të hiqet ky highlight?")) return;\n    setBusy(true);`,
  `  async function removeAnnotation(annotation: LessonAnnotation) {\n    if (!window.confirm(annotation.kind === "note" ? "Të fshihet ky sticky note?" : "Të hiqet ky highlight?")) return;\n    loadRequestRef.current += 1;\n    setBusy(true);`,
);

swap(
  "invalidate loads before highlight removal",
  `    if (!matchingHighlights.length) {\n      setNotice("Nuk ka highlighting në pjesën e zgjedhur.");\n      clearSelection();\n      return;\n    }\n\n    setBusy(true);`,
  `    if (!matchingHighlights.length) {\n      setNotice("Nuk ka highlighting në pjesën e zgjedhur.");\n      clearSelection();\n      return;\n    }\n\n    loadRequestRef.current += 1;\n    setBusy(true);`,
);

writeFileSync(file, source);
console.log("Installed annotation stability v5: outside-release recovery, conditional selection recheck and stale-load invalidation without pointer capture.");
