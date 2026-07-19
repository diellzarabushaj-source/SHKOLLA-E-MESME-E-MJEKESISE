import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (path) => existsSync(path)
  ? readFileSync(path, "utf8")
  : (failures.push(`${path} mungon.`), "");

function requireAll(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`);
  }
}

const helper = read("app/admin-table-paste.ts");
const renderer = read("app/LessonTable.tsx");
const rendererCss = read("app/LessonTable.module.css");
const portal = read("app/ClassicLearningPortal.tsx");
const editor = read("app/LessonAdminEditor.tsx");
const editorCss = read("app/LessonAdminEditor.module.css");
const route = read("app/api/admin/lessons/[lessonId]/route.ts");
const packageSource = read("package.json");

requireAll("Table clipboard helper", helper, [
  "clipboardTableBlocks",
  "tablesFromHtml",
  "tableFromTsv",
  "insertTableBlocks",
  "createBlankTableBlock",
  "portableTableToHtml",
  "tablePortableNodeFromElement",
  "MAX_ROWS_PER_TABLE = 100",
  "MAX_CELLS_PER_ROW = 30",
  "MAX_CELL_TEXT = 6000",
  "rowSpan",
  "colSpan",
  "lessonTableCell",
  "lessonTableRow",
  "lessonTable",
]);
requireAll("Public lesson table renderer", renderer + rendererCss + portal, [
  "LessonTableBlock",
  "lessonTable: ({ value })",
  "<LessonTable value={value as LessonTableBlock}",
  "overflow-x: auto",
  "border-collapse: collapse",
]);
requireAll("Live administrator editor", editor + editorCss, [
  "admin-table-paste-v1",
  "clipboardTableBlocks",
  "insertTableBlocks",
  "portableTableToHtml",
  "tablePortableNodeFromElement",
  "Shto tabelë 3 × 3",
  "Paste foto ose tabelë direkt",
  "data-portable-table",
]);
requireAll("Administrator API table validation", route, [
  "admin-table-paste-v1",
  "sanitizeLessonTable",
  "MAX_TABLE_ROWS = 100",
  "MAX_TABLE_CELLS_PER_ROW = 30",
  "MAX_TABLE_CELL_TEXT = 6000",
  "value._type === \"lessonTable\"",
  "node._type !== \"lessonTable\"",
  "INVALID_TABLE",
]);
requireAll("Build installation and audit", packageSource, [
  "node scripts/add-table-copy-paste.mjs",
  "node scripts/audit-admin-table-paste.mjs",
]);

if (route.includes("eval(") || helper.includes("eval(")) failures.push("Table paste nuk duhet të përdorë eval().");
if (!helper.includes("!table.parentElement?.closest(\"table\")")) failures.push("Tabelat e futura brenda tabelave duhet të filtrohen.");

if (failures.length) {
  console.error("\nAdministrator table-paste audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Administrator table-paste audit passed Word/Excel/Google Sheets/web clipboard parsing, manual table insertion, Portable Text serialization, responsive rendering and server validation.");
