import { readFileSync, writeFileSync } from "node:fs";

const file = "app/LessonAnnotations.tsx";
let source = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
const marker = "annotation-toolbar-portal-v2";

if (source.includes(marker)) {
  console.log("Advanced annotation toolbar positioning already installed.");
  process.exit(0);
}

if (!source.includes("adobe-sticky-popover-v1")) {
  throw new Error("Annotation toolbar positioning must run after Adobe sticky-note hardening.");
}

function swap(label, find, replacement) {
  if (!source.includes(find)) throw new Error(`${label}: pattern missing`);
  source = source.replace(find, replacement);
}

swap(
  "react-dom portal import",
  `} from "react";\nimport styles from "./LessonAnnotations.module.css";`,
  `} from "react";\nimport { createPortal } from "react-dom";\nimport styles from "./LessonAnnotations.module.css";`,
);

swap(
  "feature marker and geometry helpers",
  `export default function LessonAnnotations({`,
  `// ${marker}\n\nconst TOOLBAR_FALLBACK_WIDTH = 300;\nconst TOOLBAR_FALLBACK_HEIGHT = 64;\nconst TOOLBAR_SAFE_GAP = 12;\nconst TOOLBAR_SELECTION_GAP = 10;\n\nfunction selectionToolbarPosition(rect: DOMRect, toolbarWidth = TOOLBAR_FALLBACK_WIDTH, toolbarHeight = TOOLBAR_FALLBACK_HEIGHT) {\n  const viewport = window.visualViewport;\n  const viewportLeft = viewport?.offsetLeft ?? 0;\n  const viewportTop = viewport?.offsetTop ?? 0;\n  const viewportWidth = viewport?.width ?? window.innerWidth;\n  const viewportHeight = viewport?.height ?? window.innerHeight;\n  const usableWidth = Math.min(toolbarWidth, Math.max(0, viewportWidth - TOOLBAR_SAFE_GAP * 2));\n  const halfWidth = usableWidth / 2;\n  const minLeft = viewportLeft + TOOLBAR_SAFE_GAP + halfWidth;\n  const maxLeft = viewportLeft + viewportWidth - TOOLBAR_SAFE_GAP - halfWidth;\n  const desiredLeft = rect.left + rect.width / 2;\n  const left = maxLeft < minLeft\n    ? viewportLeft + viewportWidth / 2\n    : Math.min(maxLeft, Math.max(minLeft, desiredLeft));\n\n  const spaceAbove = rect.top - viewportTop;\n  const spaceBelow = viewportTop + viewportHeight - rect.bottom;\n  const placeAbove = spaceAbove >= toolbarHeight + TOOLBAR_SELECTION_GAP || spaceAbove >= spaceBelow;\n  const desiredTop = placeAbove\n    ? rect.top - toolbarHeight - TOOLBAR_SELECTION_GAP\n    : rect.bottom + TOOLBAR_SELECTION_GAP;\n  const minTop = viewportTop + TOOLBAR_SAFE_GAP;\n  const maxTop = viewportTop + viewportHeight - toolbarHeight - TOOLBAR_SAFE_GAP;\n  const top = maxTop < minTop\n    ? minTop\n    : Math.min(maxTop, Math.max(minTop, desiredTop));\n\n  return { left, top };\n}\n\nexport default function LessonAnnotations({`,
);

swap(
  "toolbar refs and portal host",
  `  const loadRequestRef = useRef(0);\n  const selectionTimerRef = useRef<number | null>(null);\n  const [annotations, setAnnotations] = useState<LessonAnnotation[]>([]);`,
  `  const loadRequestRef = useRef(0);\n  const selectionTimerRef = useRef<number | null>(null);\n  const selectionRangeRef = useRef<Range | null>(null);\n  const toolbarRef = useRef<HTMLDivElement>(null);\n  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);\n  const [annotations, setAnnotations] = useState<LessonAnnotation[]>([]);`,
);

swap(
  "portal host lifecycle",
  `  const [error, setError] = useState("");\n  const [notice, setNotice] = useState("");\n\n  const loadAnnotations = useCallback(async () => {`,
  `  const [error, setError] = useState("");\n  const [notice, setNotice] = useState("");\n\n  useEffect(() => {\n    setPortalHost(document.body);\n    return () => setPortalHost(null);\n  }, []);\n\n  const loadAnnotations = useCallback(async () => {`,
);

swap(
  "lesson reset clears remembered range",
  `  useEffect(() => {\n    loadRequestRef.current += 1;\n    setAnnotations([]);\n    setSelection(null);`,
  `  useEffect(() => {\n    loadRequestRef.current += 1;\n    selectionRangeRef.current = null;\n    setAnnotations([]);\n    setSelection(null);`,
);

source = source.replaceAll(
  `      setSelection(null);`,
  `      selectionRangeRef.current = null;\n      setSelection(null);`,
);

swap(
  "selection geometry",
  `    const rect = range.getBoundingClientRect();\n    const half = 160;\n    const preferredTop = rect.top > 92 ? rect.top - 62 : rect.bottom + 14;\n    setNotice("");`,
  `    const rect = range.getBoundingClientRect();\n    const position = selectionToolbarPosition(rect);\n    selectionRangeRef.current = range.cloneRange();\n    setNotice("");`,
);

swap(
  "selection coordinates",
  `      left: Math.min(window.innerWidth - half - 12, Math.max(half + 12, rect.left + rect.width / 2)),\n      top: Math.min(window.innerHeight - 66, Math.max(12, preferredTop)),`,
  `      left: position.left,\n      top: position.top,`,
);

swap(
  "live toolbar repositioning",
  `  useEffect(() => {\n    if (!enabled) return;\n    const schedule = (event?: Event) => {`,
  `  const repositionSelectionToolbar = useCallback(() => {\n    const range = selectionRangeRef.current;\n    if (!range) return;\n    const rect = range.getBoundingClientRect();\n    if (![rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite)) return;\n    const toolbarBox = toolbarRef.current?.getBoundingClientRect();\n    const position = selectionToolbarPosition(\n      rect,\n      toolbarBox?.width || TOOLBAR_FALLBACK_WIDTH,\n      toolbarBox?.height || TOOLBAR_FALLBACK_HEIGHT,\n    );\n    setSelection((current) => {\n      if (!current) return current;\n      if (Math.abs(current.left - position.left) < 0.75 && Math.abs(current.top - position.top) < 0.75) return current;\n      return { ...current, left: position.left, top: position.top };\n    });\n  }, []);\n\n  useEffect(() => {\n    if (!selection || composerOpen || !portalHost) return;\n    let frame = 0;\n    const schedule = () => {\n      window.cancelAnimationFrame(frame);\n      frame = window.requestAnimationFrame(repositionSelectionToolbar);\n    };\n    schedule();\n    window.addEventListener("scroll", schedule, true);\n    window.addEventListener("resize", schedule);\n    window.visualViewport?.addEventListener("scroll", schedule);\n    window.visualViewport?.addEventListener("resize", schedule);\n    return () => {\n      window.cancelAnimationFrame(frame);\n      window.removeEventListener("scroll", schedule, true);\n      window.removeEventListener("resize", schedule);\n      window.visualViewport?.removeEventListener("scroll", schedule);\n      window.visualViewport?.removeEventListener("resize", schedule);\n    };\n  }, [\n    composerOpen,\n    portalHost,\n    repositionSelectionToolbar,\n    selection?.blockKey,\n    selection?.startOffset,\n    selection?.endOffset,\n  ]);\n\n  useEffect(() => {\n    if (!enabled) return;\n    const schedule = (event?: Event) => {`,
);

swap(
  "clear selection range",
  `  function clearSelection() {\n    window.getSelection()?.removeAllRanges();\n    setSelection(null);\n  }`,
  `  function clearSelection() {\n    window.getSelection()?.removeAllRanges();\n    selectionRangeRef.current = null;\n    setSelection(null);\n  }`,
);

swap(
  "toolbar rendered in document body",
  `      {selection && !composerOpen && (\n        <div className={styles.selectionToolbar} data-annotation-ui data-annotation-selection-toolbar`,
  `      {selection && !composerOpen && portalHost && createPortal(\n        <div ref={toolbarRef} className={styles.selectionToolbar} data-annotation-ui data-annotation-selection-toolbar`,
);

swap(
  "toolbar portal close",
  `          </button>\n        </div>\n      )}\n\n      {composerOpen && selection && (`,
  `          </button>\n        </div>,\n        portalHost,\n      )}\n\n      {composerOpen && selection && (`,
);

writeFileSync(file, source);
console.log("Installed body-portal annotation toolbar with selection tracking, viewport clamping and above/below placement.");
