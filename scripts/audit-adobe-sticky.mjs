import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, "utf8") : (failures.push(`${file} mungon.`), "");
const requireAll = (label, source, values) => {
  for (const value of values) if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
};

const component = read("app/LessonAnnotations.tsx");
const installer = read("scripts/add-adobe-sticky-popover.mjs");
const css = read("app/adobe-sticky-popover.css");
const packageJson = JSON.parse(read("package.json") || "{}");

requireAll("Sticky note component", component, [
  "adobe-sticky-popover-v1",
  "data-adobe-note-popover",
  "data-adobe-note-colors",
  "openNoteId",
  "popoverText",
  'aria-label="Mbyll sticky note"',
]);
requireAll("Sticky note installer", installer, [
  "adobe-sticky-popover-v1",
  "setOpenNoteId",
  "setPopoverText",
  "removeAnnotation(openNotePin.annotation)",
  "updateAnnotation(openNotePin.annotation",
]);
requireAll("Responsive sticky note styling", css, [
  "[data-adobe-note-popover]",
  "[data-adobe-note-colors]",
  "position: fixed",
  "env(safe-area-inset-bottom)",
  "prefers-reduced-motion",
]);

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
if (!prepare.includes("add-adobe-sticky-popover.mjs")) failures.push("prepare:portal nuk e instalon sticky popover-in.");
if (prepare.indexOf("add-adobe-sticky-popover.mjs") <= prepare.indexOf("add-remove-highlight-option.mjs")) {
  failures.push("Sticky popover duhet të instalohet pas opsionit None.");
}

if (failures.length) {
  console.error("Adobe-style sticky note audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Adobe-style sticky note audit passed.");
