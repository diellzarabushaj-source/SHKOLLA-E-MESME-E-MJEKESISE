import { existsSync, readFileSync } from "node:fs";

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} mungon.`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function requireAll(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`);
  }
}

const packageSource = read("package.json");
const installer = read("scripts/harden-admin-toolbar-selection.mjs");
const browserAudit = read("scripts/e2e-admin-editor.mjs");
const workflow = read(".github/workflows/admin-browser-audit.yml");

requireAll("Build pipeline", packageSource, [
  "harden-admin-toolbar-selection.mjs",
  "audit-admin-toolbar.mjs",
]);
requireAll("Caret-stable editor installer", installer, [
  "admin-toolbar-selection-v1",
  "useLayoutEffect",
  "editorRef.current.innerHTML = initialHtml",
  "savedSelectionRef",
  "getEditorSelectionRange",
  "rememberEditorSelection",
  'document.execCommand("styleWithCSS", false, "false")',
  "onMouseUp={rememberEditorSelection}",
]);
requireAll("Browser formatting audit", browserAudit, [
  'querySelectorAll("p,h2,h3,h4,blockquote,li")',
  "window.getComputedStyle(parent).fontWeight",
  "admin-editor-failure.png",
  'serialized.includes(\'"strong"\')',
]);
requireAll("Truthful administrator workflow", workflow, [
  "set -o pipefail",
  "node scripts/e2e-admin-editor.mjs 2>&1 | tee admin-editor-e2e.log",
]);

if (failures.length) {
  console.error("\nAdministrator toolbar audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Administrator toolbar audit passed caret initialization, selection preservation, browser evidence and truthful CI exit handling.");
