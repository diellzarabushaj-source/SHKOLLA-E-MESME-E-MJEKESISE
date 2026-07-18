import { readFileSync, writeFileSync } from "node:fs";

const file = "app/LessonAnnotations.tsx";
let source = readFileSync(file, "utf8");

if (source.includes("adobe-sticky-popover-v1")) {
  console.log("Adobe-style sticky note popover already installed.");
  process.exit(0);
}

if (!source.includes("annotation-mobile-safety-v2") || !source.includes("highlight-removal-option-v1")) {
  throw new Error("Adobe sticky popover must run after annotation mobile and highlight-removal hardening.");
}

function swap(label, find, replacement) {
  if (!source.includes(find)) throw new Error(`${label}: pattern missing`);
  source = source.replace(find, replacement);
}

swap(
  "popover stylesheet",
  'import "./highlight-removal.css";',
  'import "./highlight-removal.css";\nimport "./adobe-sticky-popover.css";\n\n// adobe-sticky-popover-v1',
);

swap(
  "popover state",
  `  const [editingId, setEditingId] = useState<string | null>(null);\n  const [editingText, setEditingText] = useState("");`,
  `  const [editingId, setEditingId] = useState<string | null>(null);\n  const [editingText, setEditingText] = useState("");\n  const [openNoteId, setOpenNoteId] = useState<string | null>(null);\n  const [popoverText, setPopoverText] = useState("");`,
);

swap(
  "lesson-change reset",
  `    setEditingId(null);\n    setError("");`,
  `    setEditingId(null);\n    setOpenNoteId(null);\n    setPopoverText("");\n    setError("");`,
);

swap(
  "deleted-note cleanup",
  `  const recalculate = useCallback(() => {`,
  `  useEffect(() => {\n    if (!openNoteId) return;\n    if (annotations.some((annotation) => annotation.id === openNoteId && annotation.kind === "note")) return;\n    setOpenNoteId(null);\n    setPopoverText("");\n  }, [annotations, openNoteId]);\n\n  const recalculate = useCallback(() => {`,
);

swap(
  "open-note derivation",
  `  const noteCount = annotations.filter((annotation) => annotation.kind === "note").length;`,
  `  const noteCount = annotations.filter((annotation) => annotation.kind === "note").length;\n  const openNotePin = openNoteId ? notePins.find(({ annotation }) => annotation.id === openNoteId) : undefined;`,
);

swap(
  "library closes popover",
  `        onClick={() => setPanelOpen((open) => !open)}`,
  `        onClick={() => {\n          setOpenNoteId(null);\n          setPopoverText("");\n          setPanelOpen((open) => !open);\n        }}`,
);

swap(
  "pin accessibility",
  `          aria-label={\`Hape sticky note: \${annotation.noteText || annotation.quote}\`}\n          onClick={() => {`,
  `          aria-label={\`Hape sticky note: \${annotation.noteText || annotation.quote}\`}\n          aria-expanded={openNoteId === annotation.id}\n          data-active={openNoteId === annotation.id ? "true" : "false"}\n          onClick={() => {`,
);

swap(
  "pin opens contextual popover",
  `            setPanelOpen(true);\n            setEditingId(annotation.id);\n            setEditingText(annotation.noteText || "");`,
  `            setPanelOpen(false);\n            setEditingId(null);\n            setEditingText("");\n            setNotice("");\n            setError("");\n            setPopoverText(annotation.noteText || "");\n            setOpenNoteId((current) => current === annotation.id ? null : annotation.id);`,
);

swap(
  "contextual popover markup",
  `      {selection && !composerOpen && (`,
  `      {openNotePin && (\n        <aside\n          data-annotation-ui\n          data-adobe-note-popover\n          data-color={openNotePin.annotation.color}\n          role="dialog"\n          aria-label="Sticky note"\n          style={{ left: openNotePin.left, top: openNotePin.top }}\n        >\n          <header>\n            <div>\n              <strong>Sticky note</strong>\n              <span>Vetëm për llogarinë tënde</span>\n            </div>\n            <button\n              type="button"\n              aria-label="Mbyll sticky note"\n              onClick={() => { setOpenNoteId(null); setPopoverText(""); }}\n            >×</button>\n          </header>\n          <blockquote>“{openNotePin.annotation.quote}”</blockquote>\n          <textarea\n            autoFocus\n            maxLength={4_000}\n            value={popoverText}\n            onChange={(event) => setPopoverText(event.target.value)}\n            placeholder="Shkruaj shënimin tënd…"\n          />\n          <div data-adobe-note-colors aria-label="Ndrysho ngjyrën e sticky note">\n            {COLORS.map((color) => (\n              <button\n                className={openNotePin.annotation.color === color ? styles.selectedColor : ""}\n                data-color={color}\n                key={color}\n                type="button"\n                title={COLOR_LABELS[color]}\n                aria-label={COLOR_LABELS[color]}\n                disabled={busy}\n                onClick={() => void updateAnnotation(openNotePin.annotation, { color })}\n              />\n            ))}\n          </div>\n          <footer>\n            <button\n              type="button"\n              data-adobe-note-delete\n              disabled={busy}\n              onClick={() => void removeAnnotation(openNotePin.annotation)}\n            >Fshi</button>\n            <button\n              type="button"\n              data-adobe-note-save\n              disabled={busy || !popoverText.trim()}\n              onClick={() => void updateAnnotation(openNotePin.annotation, { noteText: popoverText.trim() })}\n            >{busy ? "Duke ruajtur…" : "Ruaj"}</button>\n          </footer>\n        </aside>\n      )}\n\n      {selection && !composerOpen && (`,
);

swap(
  "annotation toast boundary",
  `<div className={error ? styles.errorToast : styles.noticeToast} data-annotation-ui role=`,
  `<div className={error ? styles.errorToast : styles.noticeToast} data-annotation-ui data-annotation-toast role=`,
);

writeFileSync(file, source);
console.log("Installed an Adobe-style contextual sticky note popover for desktop and mobile.");
