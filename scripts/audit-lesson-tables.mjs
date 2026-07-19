import {existsSync, readFileSync} from "node:fs";

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, "utf8") : (failures.push(`${file} mungon.`), "");
const requireAll = (label, source, values) => {
  for (const value of values) {
    if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
  }
};

const packageJson = JSON.parse(read("package.json") || "{}");
const installer = read("scripts/add-lesson-tables.mjs");
const portal = read("app/SchoolLearningPortal.tsx");
const classic = read("app/ClassicLearningPortal.tsx");
const editor = read("app/LessonAdminEditor.tsx");
const css = read("app/lesson-table.css");
const studioLesson = read("studio/schemaTypes/lesson.ts");
const studioTable = read("studio/schemaTypes/lesson-table.ts");

requireAll("Build integration", String(packageJson.scripts?.["prepare:portal"] || ""), [
  "finalize-admin-image-paste.mjs && node scripts/add-lesson-tables.mjs",
]);

requireAll("Persistent table installer", installer, [
  "lesson-table-portable-v1",
  "lesson-table-admin-preview-v1",
  "lessonTable: LessonTableBlock",
  "data-admin-table-preview",
  "scope=\"col\"",
  "tabIndex={0}",
]);

for (const [label, source] of [["Generated portal", portal], ["Classic portal", classic]]) {
  requireAll(label, source, [
    "lesson-table-portable-v1",
    "lessonTable: LessonTableBlock",
    "data-lesson-table-scroll",
    "<caption>",
    "scope=\"col\"",
    "Tabela nuk ka ende rreshta.",
  ]);
}

requireAll("Administrator table preview", editor, [
  "lesson-table-admin-preview-v1",
  "renderTablePreview",
  "data-admin-table-preview",
  "editohet në Sanity",
]);

requireAll("Responsive table styling", css, [
  "[data-lesson-table-scroll]",
  "overflow-x: auto",
  "-webkit-overflow-scrolling: touch",
  "[data-lesson-table] thead th",
  "@media (max-width: 700px)",
]);

requireAll("Sanity table option", studioLesson, ["name: 'lessonTable'", "title: 'Tabelë'", "type: 'lessonTable'"]);
requireAll("Sanity structured table data", studioTable, [
  "name: 'lessonTableColumn'",
  "name: 'lessonTableRow'",
  "name: 'lessonTableCell'",
  "duhet të ketë saktësisht",
]);

if (/dangerouslySetInnerHTML/.test(portal) || /dangerouslySetInnerHTML/.test(installer)) {
  failures.push("Renderer-i i tabelës nuk duhet të përdorë dangerouslySetInnerHTML.");
}

if (failures.length) {
  console.error("Lesson table audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Structured Sanity lesson tables passed schema, rendering, mobile and admin preservation audits.");
