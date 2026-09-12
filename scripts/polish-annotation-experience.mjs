import { readFileSync, writeFileSync } from "node:fs";

const file = "app/LessonAnnotations.tsx";
let source = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
const marker = "annotation-experience-v3";

if (source.includes(marker)) {
  console.log("Annotation experience v3 already installed.");
  process.exit(0);
}

if (!source.includes("annotation-toolbar-portal-v2")) {
  throw new Error("Annotation experience v3 must run after contextual toolbar positioning.");
}

function swap(label, find, replacement) {
  if (!source.includes(find)) throw new Error(`${label}: pattern missing`);
  source = source.replace(find, replacement);
}

swap(
  "polish stylesheet",
  `import "./adobe-sticky-toast.css";`,
  `import "./adobe-sticky-toast.css";\nimport "./annotation-context-polish.css";`,
);

swap(
  "feature marker",
  `// annotation-toolbar-portal-v2`,
  `// annotation-toolbar-portal-v2\n// ${marker}`,
);

swap(
  "selection placement type",
  `  suffix: string;\n  left: number;\n  top: number;\n};`,
  `  suffix: string;\n  left: number;\n  top: number;\n  placement: "above" | "below";\n};`,
);

swap(
  "position helper placement",
  `  return { left, top };`,
  `  return { left, top, placement: placeAbove ? "above" as const : "below" as const };`,
);

swap(
  "initial placement",
  `      left: position.left,\n      top: position.top,\n    });`,
  `      left: position.left,\n      top: position.top,\n      placement: position.placement,\n    });`,
);

swap(
  "live placement update",
  `      if (Math.abs(current.left - position.left) < 0.75 && Math.abs(current.top - position.top) < 0.75) return current;\n      return { ...current, left: position.left, top: position.top };`,
  `      if (\n        Math.abs(current.left - position.left) < 0.75\n        && Math.abs(current.top - position.top) < 0.75\n        && current.placement === position.placement\n      ) return current;\n      return { ...current, left: position.left, top: position.top, placement: position.placement };`,
);

swap(
  "escape and outside dismiss",
  `  function clearSelection() {\n    window.getSelection()?.removeAllRanges();\n    selectionRangeRef.current = null;\n    setSelection(null);\n  }\n\n  async function createAnnotation`,
  `  function clearSelection() {\n    window.getSelection()?.removeAllRanges();\n    selectionRangeRef.current = null;\n    setSelection(null);\n  }\n\n  useEffect(() => {\n    const onKeyDown = (event: KeyboardEvent) => {\n      if (event.key !== "Escape") return;\n      if (composerOpen) {\n        setComposerOpen(false);\n        return;\n      }\n      if (openNoteId) {\n        setOpenNoteId(null);\n        setPopoverText("");\n        return;\n      }\n      if (panelOpen) {\n        setPanelOpen(false);\n        return;\n      }\n      if (selection) clearSelection();\n    };\n    document.addEventListener("keydown", onKeyDown);\n    return () => document.removeEventListener("keydown", onKeyDown);\n  }, [composerOpen, openNoteId, panelOpen, selection]);\n\n  useEffect(() => {\n    if (!selection || composerOpen) return;\n    const onPointerDown = (event: PointerEvent) => {\n      const target = event.target instanceof Element ? event.target : null;\n      if (target?.closest("[data-annotation-ui]")) return;\n      clearSelection();\n    };\n    document.addEventListener("pointerdown", onPointerDown, true);\n    return () => document.removeEventListener("pointerdown", onPointerDown, true);\n  }, [composerOpen, selection?.blockKey, selection?.startOffset, selection?.endOffset]);\n\n  async function createAnnotation`,
);

swap(
  "selection highlight derivation",
  `  const noteCount = annotations.filter((annotation) => annotation.kind === "note").length;\n  const openNotePin = openNoteId ? notePins.find(({ annotation }) => annotation.id === openNoteId) : undefined;`,
  `  const noteCount = annotations.filter((annotation) => annotation.kind === "note").length;\n  const openNotePin = openNoteId ? notePins.find(({ annotation }) => annotation.id === openNoteId) : undefined;\n  const selectionHighlight = selection\n    ? annotations.find((annotation) =>\n        annotation.kind === "highlight"\n        && annotation.blockKey === selection.blockKey\n        && annotation.startOffset === selection.startOffset\n        && annotation.endOffset === selection.endOffset\n      ) || annotations.find((annotation) =>\n        annotation.kind === "highlight"\n        && annotation.blockKey === selection.blockKey\n        && annotation.startOffset < selection.endOffset\n        && annotation.endOffset > selection.startOffset\n      )\n    : undefined;`,
);

swap(
  "sticky popover keyboard save and counter",
  `          <textarea\n            autoFocus\n            maxLength={4_000}\n            value={popoverText}\n            onChange={(event) => setPopoverText(event.target.value)}\n            placeholder="Shkruaj shënimin tënd…"\n          />`,
  `          <textarea\n            autoFocus\n            maxLength={4_000}\n            value={popoverText}\n            onChange={(event) => setPopoverText(event.target.value)}\n            onKeyDown={(event) => {\n              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && popoverText.trim() && !busy) {\n                event.preventDefault();\n                void updateAnnotation(openNotePin.annotation, { noteText: popoverText.trim() });\n              }\n            }}\n            placeholder="Shkruaj shënimin tënd…"\n          />\n          <span data-annotation-character-count>{popoverText.length} / 4000</span>`,
);

swap(
  "toolbar placement attribute",
  `        <div ref={toolbarRef} className={styles.selectionToolbar} data-annotation-ui data-annotation-selection-toolbar\n          style=`,
  `        <div ref={toolbarRef} className={styles.selectionToolbar} data-annotation-ui data-annotation-selection-toolbar\n          data-placement={selection.placement}\n          style=`,
);

swap(
  "active highlight color",
  `          {COLORS.map((color) => (\n            <button\n              className={styles.colorButton}\n              data-color={color}\n              key={color}\n              type="button"\n              title={COLOR_LABELS[color]}\n              aria-label={\`Thekso \${COLOR_LABELS[color].toLowerCase()}\`}\n              disabled={busy}\n              onClick={() => void createAnnotation("highlight", color, null)}\n            />\n          ))}`,
  `          {COLORS.map((color) => (\n            <button\n              className={styles.colorButton + (selectionHighlight?.color === color ? " " + styles.selectedColor : "")}\n              data-color={color}\n              key={color}\n              type="button"\n              title={COLOR_LABELS[color]}\n              aria-label={"Thekso " + COLOR_LABELS[color].toLowerCase()}\n              aria-pressed={selectionHighlight?.color === color}\n              disabled={busy}\n              onClick={() => void createAnnotation("highlight", color, null)}\n            />\n          ))}`,
);

swap(
  "composer keyboard save and counter",
  `            <textarea\n              autoFocus\n              maxLength={4_000}\n              value={noteText}\n              onChange={(event) => setNoteText(event.target.value)}\n              placeholder="Shkruaj shënimin tënd…"\n            />`,
  `            <textarea\n              autoFocus\n              maxLength={4_000}\n              value={noteText}\n              onChange={(event) => setNoteText(event.target.value)}\n              onKeyDown={(event) => {\n                if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && noteText.trim() && !busy) {\n                  event.preventDefault();\n                  void createAnnotation("note", noteColor, noteText.trim());\n                }\n              }}\n              placeholder="Shkruaj shënimin tënd…"\n            />\n            <span data-annotation-character-count>{noteText.length} / 4000</span>`,
);

writeFileSync(file, source);
console.log("Installed annotation experience v3: placement-aware toolbar, active highlight state, keyboard dismissal/save and note counters.");
