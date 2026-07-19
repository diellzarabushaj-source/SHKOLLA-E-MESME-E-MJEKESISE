import { readFileSync, writeFileSync } from "node:fs";

const editorPath = "app/LessonAdminEditor.tsx";
const marker = "admin-toolbar-selection-v1";
let source = readFileSync(editorPath, "utf8");

if (source.includes(marker)) {
  console.log("Admin toolbar selection preservation is already installed.");
  process.exit(0);
}

function replaceRequired(label, before, after) {
  if (!source.includes(before)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(before, after);
}

replaceRequired(
  "layout effect import",
  `  useEffect,\n  useMemo,`,
  `  useEffect,\n  useLayoutEffect,\n  useMemo,`,
);

replaceRequired(
  "selection ref",
  `  const editorRef = useRef<HTMLDivElement>(null);\n  const [currentLesson, setCurrentLesson]`,
  `  const editorRef = useRef<HTMLDivElement>(null);\n  const savedSelectionRef = useRef<Range | null>(null);\n  const [currentLesson, setCurrentLesson]`,
);

replaceRequired(
  "imperative editor initialization",
  `  const initialHtml = useMemo(() => portableToHtml(sourceBody), [sourceBody, editorVersion]);\n\n  async function readLatestFromSanity`,
  `  const initialHtml = useMemo(() => portableToHtml(sourceBody), [sourceBody, editorVersion]);\n\n  // Initialize the editable document only when it opens or receives a fresh Sanity version.\n  // React must not rewrite innerHTML after every keystroke because that moves the caret.\n  useLayoutEffect(() => {\n    if (!editing || !editorRef.current) return;\n    editorRef.current.innerHTML = initialHtml;\n    savedSelectionRef.current = null;\n  }, [editing, editorVersion, initialHtml]);\n\n  async function readLatestFromSanity`,
);

replaceRequired(
  "selection-safe toolbar",
  `  function runCommand(event: MouseEvent<HTMLButtonElement>, command: string, value?: string) {\n    event.preventDefault();\n    editorRef.current?.focus();\n    document.execCommand(command, false, value);\n    setDirty(true);\n    setNotice(\"\");\n    setError(\"\");\n  }`,
  `  // ${marker}: toolbar buttons must not collapse the user's text selection.\n  function getEditorSelectionRange(): Range | null {\n    const editor = editorRef.current;\n    const selection = window.getSelection();\n    if (!editor || !selection || selection.rangeCount === 0) return null;\n\n    const range = selection.getRangeAt(0);\n    const container = range.commonAncestorContainer;\n    const selectionNode = container.nodeType === Node.ELEMENT_NODE ? container : container.parentNode;\n    if (!selectionNode || !editor.contains(selectionNode)) return null;\n    return range.cloneRange();\n  }\n\n  function rememberEditorSelection() {\n    const range = getEditorSelectionRange();\n    if (range) savedSelectionRef.current = range;\n  }\n\n  function runCommand(event: MouseEvent<HTMLButtonElement>, command: string, value?: string) {\n    event.preventDefault();\n    const editor = editorRef.current;\n    if (!editor) return;\n\n    let activeRange = getEditorSelectionRange();\n    if (!activeRange && savedSelectionRef.current) {\n      try {\n        activeRange = savedSelectionRef.current.cloneRange();\n      } catch {\n        savedSelectionRef.current = null;\n      }\n    }\n\n    editor.focus({ preventScroll: true });\n    const selection = window.getSelection();\n    if (activeRange && selection) {\n      selection.removeAllRanges();\n      selection.addRange(activeRange);\n    }\n\n    document.execCommand(\"styleWithCSS\", false, \"false\");\n    document.execCommand(command, false, value);\n    rememberEditorSelection();\n    setDirty(true);\n    setNotice(\"\");\n    setError(\"\");\n  }`,
);

replaceRequired(
  "selection event capture",
  `          dangerouslySetInnerHTML={{ __html: initialHtml }}\n          onInput={() => {\n            setDirty(true);\n            setNotice(\"\");\n            setError(\"\");\n          }}\n          onPaste={onPaste}`,
  `          onInput={() => {\n            rememberEditorSelection();\n            setDirty(true);\n            setNotice(\"\");\n            setError(\"\");\n          }}\n          onKeyUp={rememberEditorSelection}\n          onMouseUp={rememberEditorSelection}\n          onSelect={rememberEditorSelection}\n          onPaste={onPaste}`,
);

writeFileSync(editorPath, source);
console.log("Installed caret-stable, selection-safe administrator toolbar formatting.");
