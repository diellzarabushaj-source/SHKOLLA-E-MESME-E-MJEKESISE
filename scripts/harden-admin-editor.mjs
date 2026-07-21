import { readFileSync, writeFileSync } from "node:fs";

const editorPath = "app/LessonAdminEditor.tsx";
let source = readFileSync(editorPath, "utf8").replace(/\r\n?/g, "\n");

if (source.includes("admin-editor-safety-v1")) {
  process.stdout.write("Admin editor safety is already installed.\n");
  process.exit(0);
}

function replaceRequired(label, pattern, replacement) {
  if (!source.includes(pattern)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(pattern, replacement);
}

replaceRequired(
  "safety marker",
  'import styles from "./LessonAdminEditor.module.css";',
  'import styles from "./LessonAdminEditor.module.css";\n\n// admin-editor-safety-v1',
);

replaceRequired(
  "safe editor links",
  `  if (!href || href.length > 2048) return null;
  if (href.startsWith("/") || href.startsWith("#")) return href;`,
  `  if (!href || href.length > 2048 || /[\\u0000-\\u001F\\u007F]/.test(href)) return null;
  if (href.startsWith("#")) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;`,
);

replaceRequired(
  "protected element message",
  `  if (error === "LESSON_NOT_FOUND") return "Mësimi nuk u gjet në Sanity.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri.";`,
  `  if (error === "LESSON_NOT_FOUND") return "Mësimi nuk u gjet në Sanity.";
  if (error === "INVALID_EMBEDDED_CONTENT") return "Një fotografi ose element i mbrojtur është hequr nga editori. Rifreskoje nga Sanity dhe provo përsëri.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri.";`,
);

replaceRequired(
  "unique text block keys",
  `  return result.length ? result : [{
    _key: keyFor("block"),
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [{ _key: keyFor("span"), _type: "span", text: "", marks: [] }],
  }];`,
  `  const usedBlockKeys = new Set<string>();
  for (const node of result) {
    if (typeof node._key !== "string") continue;
    if (usedBlockKeys.has(node._key) && node._type === "block") node._key = keyFor("block");
    usedBlockKeys.add(node._key);
  }

  return result.length ? result : [{
    _key: keyFor("block"),
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [{ _key: keyFor("span"), _type: "span", text: "", marks: [] }],
  }];`,
);

replaceRequired(
  "unsaved change guard",
  `  useEffect(() => {
    if (editing) return;
    setCurrentLesson(lesson);
    setSourceBody(structuredClone(lesson.body || []));
  }, [editing, lesson]);`,
  `  useEffect(() => {
    if (editing) return;
    setCurrentLesson(lesson);
    setSourceBody(structuredClone(lesson.body || []));
  }, [editing, lesson]);

  useEffect(() => {
    if (!editing || !dirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLinkNavigation = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target || target.closest('[contenteditable="true"]')) return;
      if (!window.confirm("Ke ndryshime të paruajtura. Të largohesh pa i ruajtur?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, [editing, dirty]);`,
);

replaceRequired(
  "cancel confirmation",
  `  function cancel() {
    setEditing(false);`,
  `  function cancel() {
    if (dirty && !window.confirm("Të anulohen ndryshimet e paruajtura?")) return;
    setEditing(false);`,
);

replaceRequired(
  "editor link click protection",
  `          onPaste={onPaste}
        />`,
  `          onPaste={onPaste}
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault();
          }}
        />`,
);

writeFileSync(editorPath, source);
process.stdout.write("Installed admin editor loss-prevention safeguards.\n");
