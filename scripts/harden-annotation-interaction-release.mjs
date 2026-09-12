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
  "release lifecycle and deferred selection recheck",
  `  const endToolbarInteraction = useCallback(() => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n    toolbarReleaseTimerRef.current = window.setTimeout(() => {\n      toolbarInteractionRef.current = false;\n      toolbarReleaseTimerRef.current = null;\n    }, TOOLBAR_INTERACTION_RELEASE_MS);\n  }, []);\n\n  useEffect(() => () => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n  }, []);`,
  `  const scheduleSelectionRecheck = useCallback(() => {\n    window.requestAnimationFrame(() => {\n      const activeSelection = window.getSelection();\n      if (!activeSelection || activeSelection.isCollapsed || activeSelection.rangeCount === 0) return;\n      document.dispatchEvent(new Event("selectionchange"));\n    });\n  }, []);\n\n  const endToolbarInteraction = useCallback(() => {\n    if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n    toolbarReleaseTimerRef.current = window.setTimeout(() => {\n      toolbarInteractionRef.current = false;\n      toolbarReleaseTimerRef.current = null;\n      scheduleSelectionRecheck();\n    }, TOOLBAR_INTERACTION_RELEASE_MS);\n  }, [scheduleSelectionRecheck]);\n\n  useEffect(() => {\n    const releaseInteraction = () => {\n      if (toolbarInteractionRef.current) endToolbarInteraction();\n    };\n    const releaseWhenHidden = () => {\n      if (document.visibilityState !== "visible") releaseInteraction();\n    };\n\n    document.addEventListener("pointerup", releaseInteraction, true);\n    document.addEventListener("pointercancel", releaseInteraction, true);\n    document.addEventListener("visibilitychange", releaseWhenHidden);\n    window.addEventListener("blur", releaseInteraction);\n\n    return () => {\n      document.removeEventListener("pointerup", releaseInteraction, true);\n      document.removeEventListener("pointercancel", releaseInteraction, true);\n      document.removeEventListener("visibilitychange", releaseWhenHidden);\n      window.removeEventListener("blur", releaseInteraction);\n      if (toolbarReleaseTimerRef.current !== null) window.clearTimeout(toolbarReleaseTimerRef.current);\n    };\n  }, [endToolbarInteraction]);`,
);

swap(
  "pointer capture",
  `          onPointerDown={(event) => {\n            beginToolbarInteraction();\n            event.preventDefault();\n            event.stopPropagation();\n          }}\n          onPointerUp={(event) => {\n            event.stopPropagation();\n            endToolbarInteraction();\n          }}\n          onPointerCancel={() => endToolbarInteraction()}>`,
  `          onPointerDown={(event) => {\n            beginToolbarInteraction();\n            try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}\n            event.preventDefault();\n            event.stopPropagation();\n          }}\n          onPointerUp={(event) => {\n            try {\n              if (event.currentTarget.hasPointerCapture(event.pointerId)) {\n                event.currentTarget.releasePointerCapture(event.pointerId);\n              }\n            } catch {}\n            event.stopPropagation();\n            endToolbarInteraction();\n          }}\n          onPointerCancel={(event) => {\n            try {\n              if (event.currentTarget.hasPointerCapture(event.pointerId)) {\n                event.currentTarget.releasePointerCapture(event.pointerId);\n              }\n            } catch {}\n            endToolbarInteraction();\n          }}>`,
);

writeFileSync(file, source);
console.log("Installed annotation stability v5: global pointer release, pointer capture and deferred selection recovery.");
