import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/ClassicLearningPortal.tsx";
const marker = "markdown-lesson-formatting-v1";
let portal = readFileSync(portalPath, "utf8");

function replaceRequired(target, label, before, after) {
  if (!target.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return target.replace(before, after);
}

if (!portal.includes("admin-table-paste-v1")) {
  throw new Error("Markdown lesson formatting must run after the lesson table renderer is installed.");
}

if (!portal.includes(marker)) {
  portal = replaceRequired(
    portal,
    "Markdown lesson renderer import",
    `import LessonTable, { type LessonTableBlock } from "./LessonTable";`,
    `import LessonTable, { type LessonTableBlock } from "./LessonTable";
import MarkdownLessonBlock from "./MarkdownLessonContent";

// ${marker}`,
  );

  portal = replaceRequired(
    portal,
    "Portable Text normal block renderer",
    `const portableTextComponents: PortableTextComponents = {
  types: {`,
    `const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children, value }) => (
      <MarkdownLessonBlock value={value}>{children}</MarkdownLessonBlock>
    ),
  },
  types: {`,
  );
}

writeFileSync(portalPath, portal);
console.log("Markdown lesson formatting is enabled.");
