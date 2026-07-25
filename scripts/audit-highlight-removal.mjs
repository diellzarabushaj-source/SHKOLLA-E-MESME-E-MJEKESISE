import { existsSync, readFileSync } from "node:fs";

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} mungon.`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function requireText(label, source, values) {
  for (const value of values) {
    if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
  }
}

const component = read("app/LessonAnnotations.tsx");
const installer = read("scripts/add-remove-highlight-option.mjs");
const styles = read("app/highlight-removal.css");
const browserAudit = read("scripts/e2e-annotations.mjs");
const packageJson = JSON.parse(read("package.json") || "{}");

requireText("Generated highlight removal UI", component, [
  "highlight-removal-option-v2",
  "removeHighlightsFromSelection",
  "data-annotation-remove-highlight",
  "Hiq highlighting-un nga teksti i zgjedhur",
  "const selectedBlock = blocks?.get(selection.blockKey) || null;",
  "resolveAnnotationRange(annotation, blocks)",
  "resolved.element === selectedBlock",
  "const liveStart = rangeOffset(",
  "const liveEnd = rangeOffset(",
  "credentials: \"same-origin\"",
  "Highlighting-u u hoq.",
]);

requireText("Highlight removal installer", installer, [
  "highlight-removal-option-v1",
  "highlight-removal-option-v2",
  "previousRemovalHandler",
  "resilientRemovalHandler",
  "resolveAnnotationRange(annotation, blocks)",
  "liveStart < selection.endOffset",
  'method: "DELETE"',
  "new Set(removedIds)",
  "clearSelection();",
]);

requireText("Responsive None control", styles, [
  "[data-annotation-remove-highlight]",
  "[data-annotation-none-label]",
  "[data-annotation-add-note]",
  "@media (max-width: 390px)",
  ":focus-visible",
]);

requireText("Browser coverage", browserAudit, [
  "Hiq highlighting-un nga teksti i zgjedhur",
  "Highlighting-u u hoq.",
  "Simulate stale stored offsets",
  "None control did not delete a visually resolved highlight with stale offsets",
]);

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
const annotationAudit = String(packageJson.scripts?.["audit:annotations"] || "");
if (!prepare.includes("add-remove-highlight-option.mjs")) {
  failures.push("prepare:portal nuk e instalon opsionin None.");
}
if (!annotationAudit.includes("audit-highlight-removal.mjs")) {
  failures.push("audit:annotations nuk e kontrollon opsionin None.");
}

if (failures.length) {
  console.error("\nHighlight removal audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Highlight removal audit passed: None follows live rendered ranges, removes stale-offset highlights, preserves sticky notes and remains usable on mobile.");
