import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, "utf8") : (failures.push(`${file} mungon.`), "");
const requireAll = (label, source, values) => {
  for (const value of values) if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
};

const component = read("app/LessonAnnotations.tsx");
const installer = read("scripts/polish-pdf-comment-popover.mjs");
const css = read("app/pdf-comment-popover.css");
const e2e = read("scripts/e2e-adobe-sticky.mjs");
const packageJson = JSON.parse(read("package.json") || "{}");

requireAll("PDF comment component", component, [
  "pdf-comment-popover-v2",
  "data-pdf-comment-popover",
  "data-pdf-comment-pin",
  "data-pdf-comment-body",
  "data-pdf-comment-editor",
  "data-pdf-comment-actions",
  "popoverEditing",
  "openNoteDirty",
  'aria-label="Ndrysho komentin"',
  'aria-label="Mbyll komentin"',
  "Komenti im",
  "Ndryshime të paruajtura",
]);

requireAll("PDF comment installer", installer, [
  "adobe-sticky-popover-v1",
  "pdf-comment-popover-v2",
  "setPopoverEditing(false)",
  "setOpenNoteId(result.annotation.id)",
  "document.addEventListener(\"pointerdown\"",
  "document.addEventListener(\"keydown\"",
  "Promise<boolean>",
]);

requireAll("PDF comment styling", css, [
  "[data-pdf-comment-pin]",
  "[data-pdf-comment-popover]",
  "[data-pdf-comment-body]",
  "[data-pdf-comment-editor]",
  "[data-pdf-comment-actions]",
  "env(safe-area-inset-bottom)",
  "max-height: min(72dvh, 620px)",
  "prefers-reduced-motion",
]);

requireAll("PDF comment browser coverage", e2e, [
  "data-pdf-comment-popover",
  "Ndrysho komentin",
  "Teksti i komentit",
  "Anulo",
  "Mbyll komentin",
  "read-only before editing",
]);

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
const adobeIndex = prepare.indexOf("add-adobe-sticky-popover.mjs");
const pdfIndex = prepare.indexOf("polish-pdf-comment-popover.mjs");
if (adobeIndex < 0 || pdfIndex <= adobeIndex) failures.push("PDF comment polish duhet të ekzekutohet pas Adobe sticky popover-it.");
if (!String(packageJson.scripts?.["audit:annotations"] || "").includes("audit-pdf-comment-popover.mjs")) {
  failures.push("audit:annotations nuk e përfshin auditimin e PDF comment popover-it.");
}

if (failures.length) {
  console.error("PDF-style comment popover audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PDF-style comment popover audit passed.");
