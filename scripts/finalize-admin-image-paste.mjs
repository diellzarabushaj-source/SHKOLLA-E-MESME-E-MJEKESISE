import { readFileSync, writeFileSync } from "node:fs";

const editorPath = "app/LessonAdminEditor.tsx";
let source = readFileSync(editorPath, "utf8");
const brokenSelector = `removeButton.closest("figure[data-pasted-sanity-image="true"]")`;
const safeSelector = `removeButton.closest('figure[data-pasted-sanity-image="true"]')`;

if (source.includes(brokenSelector)) source = source.replace(brokenSelector, safeSelector);
if (!source.includes(safeSelector)) throw new Error("Direct image paste remove selector was not finalized.");

writeFileSync(editorPath, source);
console.log("Finalized the direct image paste selector for valid TypeScript output.");
