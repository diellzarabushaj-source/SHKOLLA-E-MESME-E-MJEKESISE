import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/ClassicLearningPortal.tsx";
const editorPath = "app/LessonAdminEditor.tsx";
const lessonRoutePath = "app/api/admin/lessons/[lessonId]/route.ts";
const cssPath = "app/LessonAdminEditor.module.css";
const marker = "admin-table-paste-v1";

let portal = readFileSync(portalPath, "utf8");
let editor = readFileSync(editorPath, "utf8");
let route = readFileSync(lessonRoutePath, "utf8");
let css = readFileSync(cssPath, "utf8");

function replaceRequired(target, label, before, after) {
  if (!target.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return target.replace(before, after);
}

if (!editor.includes("admin-image-paste-v1") || !route.includes("admin-image-paste-v1")) {
  throw new Error("Table paste must run after direct image paste hardening.");
}

if (!portal.includes(marker)) {
  portal = replaceRequired(
    portal,
    "lesson table renderer import",
    `import LessonAdminEditor, { type AdminEditableLesson } from "./LessonAdminEditor";`,
    `import LessonAdminEditor, { type AdminEditableLesson } from "./LessonAdminEditor";
import LessonTable, { type LessonTableBlock } from "./LessonTable";

// ${marker}`,
  );

  portal = replaceRequired(
    portal,
    "Portable Text table renderer",
    `    image: ({ value }) => {
      const image = value as SanityImage;
      const url = image.assetUrl || image.asset?.url;
      if (!url) return null;
      return (
        <figure className={styles.portableImage}>
          <img src={url} alt={image.alt || "Foto e mësimit"} loading="lazy" />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      );
    },`,
    `    image: ({ value }) => {
      const image = value as SanityImage;
      const url = image.assetUrl || image.asset?.url;
      if (!url) return null;
      return (
        <figure className={styles.portableImage}>
          <img src={url} alt={image.alt || "Foto e mësimit"} loading="lazy" />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      );
    },
    lessonTable: ({ value }) => <LessonTable value={value as LessonTableBlock} />,`,
  );
}

if (!editor.includes(marker)) {
  editor = replaceRequired(
    editor,
    "table paste imports",
    `// admin-image-paste-v1`,
    `// admin-image-paste-v1
import {
  clipboardTableBlocks,
  createBlankTableBlock,
  insertTableBlocks,
  portableTableToHtml,
  tablePortableNodeFromElement,
} from "./admin-table-paste";

// ${marker}`,
  );

  editor = replaceRequired(
    editor,
    "table paste error messages",
    `  if (error === "IMAGE_REQUIRED" || error === "IMAGE_EMPTY") return "Clipboard-i nuk përmbante një fotografi të vlefshme.";`,
    `  if (error === "IMAGE_REQUIRED" || error === "IMAGE_EMPTY") return "Clipboard-i nuk përmbante një fotografi të vlefshme.";
  if (error === "TABLE_TOO_LARGE") return "Tabela është tepër e madhe. Lejohen deri në 100 rreshta dhe 30 kolona.";
  if (error === "TABLE_CELL_TOO_LARGE") return "Një qelizë e tabelës ka më shumë se 6000 shkronja.";
  if (error === "TOO_MANY_TABLES") return "Mund të ngjiten maksimumi 5 tabela njëherësh.";
  if (error === "INVALID_TABLE_CLIPBOARD" || error === "INVALID_TABLE") return "Tabela nuk u njoh. Kopjoje përsëri nga Word, Excel, Google Sheets ose web-i.";`,
  );

  editor = replaceRequired(
    editor,
    "render editable table blocks",
    `    if (node._type !== "block") {
      html.push(renderImmutable(node));
      continue;
    }`,
    `    if (node._type !== "block") {
      const tableHtml = portableTableToHtml(node);
      html.push(tableHtml || renderImmutable(node));
      continue;
    }`,
  );

  editor = replaceRequired(
    editor,
    "serialize table blocks",
    `    const pastedImage = pastedImagePortableNode(child);
    if (pastedImage) {
      result.push(pastedImage);
      continue;
    }`,
    `    const table = tablePortableNodeFromElement(child);
    if (table) {
      result.push(table);
      continue;
    }

    const pastedImage = pastedImagePortableNode(child);
    if (pastedImage) {
      result.push(pastedImage);
      continue;
    }`,
  );

  editor = replaceRequired(
    editor,
    "manual table insertion function",
    `  async function uploadPastedImage(file: File, uploadKey: string) {`,
    `  function insertBlankTable(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    insertTableBlocks(editor, [createBlankTableBlock()]);
    rememberEditorSelection();
    setDirty(true);
    setNotice("Tabela u shtua. Plotëso qelizat dhe ruaje mësimin.");
    setError("");
  }

  async function uploadPastedImage(file: File, uploadKey: string) {`,
  );

  editor = replaceRequired(
    editor,
    "direct table paste handler",
    `    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");`,
    `    let pastedTables;
    try {
      pastedTables = clipboardTableBlocks(event.clipboardData);
    } catch (tableError) {
      event.preventDefault();
      const reason = tableError instanceof Error ? tableError.message : "INVALID_TABLE_CLIPBOARD";
      setError(messageFor(reason));
      setNotice("");
      return;
    }

    if (pastedTables.length) {
      event.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;
      insertTableBlocks(editor, pastedTables);
      rememberEditorSelection();
      setDirty(true);
      setError("");
      setNotice(pastedTables.length === 1
        ? "Tabela u ngjit. Ruaje mësimin për ta publikuar."
        : pastedTables.length + " tabela u ngjitën. Ruaje mësimin për t’i publikuar.");
      return;
    }

    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");`,
  );

  editor = replaceRequired(
    editor,
    "table toolbar button",
    `            <button type="button" onMouseDown={(event) => runCommand(event, "insertOrderedList")}>1. Listë</button>`,
    `            <button type="button" onMouseDown={(event) => runCommand(event, "insertOrderedList")}>1. Listë</button>
            <button type="button" title="Shto tabelë 3 × 3" onMouseDown={insertBlankTable}>▦ Tabelë</button>`,
  );

  editor = replaceRequired(
    editor,
    "clipboard guidance",
    `          <strong>Paste fotografinë direkt</strong>
          <span>Kopjoje fotografinë ose screenshot-in dhe shtyp Ctrl/⌘ + V në vendin ku duhet të shfaqet.</span>`,
    `          <strong>Paste foto ose tabelë direkt</strong>
          <span>Kopjo një fotografi, screenshot ose tabelë nga Word, Excel, Google Sheets apo web-i dhe shtyp Ctrl/⌘ + V te pozita e kursorit.</span>`,
  );

  editor = editor.replace(
    `Fotografitë dhe elementet e posaçme ruhen të pandryshuara.`,
    `Fotografitë, tabelat dhe elementet e posaçme ruhen në Sanity.`,
  );
}

if (!route.includes(marker)) {
  route = replaceRequired(
    route,
    "route table paste marker",
    `// admin-image-paste-v1`,
    `// admin-image-paste-v1
// ${marker}`,
  );

  route = replaceRequired(
    route,
    "table limits",
    `const SANITY_IMAGE_ASSET_PATTERN = /^image-[A-Za-z0-9]+-\\d+x\\d+-[A-Za-z0-9]+$/;`,
    `const SANITY_IMAGE_ASSET_PATTERN = /^image-[A-Za-z0-9]+-\\d+x\\d+-[A-Za-z0-9]+$/;
const MAX_TABLE_ROWS = 100;
const MAX_TABLE_CELLS_PER_ROW = 30;
const MAX_TABLE_CELL_TEXT = 6000;`,
  );

  route = replaceRequired(
    route,
    "table sanitizer",
    `function sanitizeBody(proposed: unknown, currentBody: PortableNode[]): PortableNode[] {`,
    `function sanitizeLessonTable(node: PortableNode): PortableNode {
  const key = safeText(node._key, 80);
  const caption = typeof node.caption === "string" ? safeText(node.caption, 1000).trim() : "";
  if (!Array.isArray(node.rows) || node.rows.length < 1 || node.rows.length > MAX_TABLE_ROWS) {
    throw new Error("INVALID_TABLE");
  }

  const usedRowKeys = new Set<string>();
  const rows = node.rows.map((rowValue, rowIndex) => {
    if (!isRecord(rowValue) || rowValue._type !== "lessonTableRow") throw new Error("INVALID_TABLE");
    const rowKey = typeof rowValue._key === "string" && rowValue._key.length <= 80
      ? rowValue._key
      : key + "-row-" + rowIndex;
    if (usedRowKeys.has(rowKey)) throw new Error("INVALID_TABLE");
    usedRowKeys.add(rowKey);

    if (!Array.isArray(rowValue.cells) || rowValue.cells.length < 1 || rowValue.cells.length > MAX_TABLE_CELLS_PER_ROW) {
      throw new Error("INVALID_TABLE");
    }
    const usedCellKeys = new Set<string>();
    const cells = rowValue.cells.map((cellValue, cellIndex) => {
      if (!isRecord(cellValue) || cellValue._type !== "lessonTableCell") throw new Error("INVALID_TABLE");
      const cellKey = typeof cellValue._key === "string" && cellValue._key.length <= 80
        ? cellValue._key
        : rowKey + "-cell-" + cellIndex;
      if (usedCellKeys.has(cellKey)) throw new Error("INVALID_TABLE");
      usedCellKeys.add(cellKey);

      const rowSpan = Math.min(30, Math.max(1, Number(cellValue.rowSpan) || 1));
      const colSpan = Math.min(30, Math.max(1, Number(cellValue.colSpan) || 1));
      return {
        _key: cellKey,
        _type: "lessonTableCell",
        text: safeText(cellValue.text ?? "", MAX_TABLE_CELL_TEXT),
        isHeader: cellValue.isHeader === true,
        rowSpan: Number.isInteger(rowSpan) ? rowSpan : 1,
        colSpan: Number.isInteger(colSpan) ? colSpan : 1,
      };
    });

    return { _key: rowKey, _type: "lessonTableRow", cells };
  });

  return {
    _key: key,
    _type: "lessonTable",
    ...(caption ? { caption } : {}),
    rows,
  };
}

function sanitizeBody(proposed: unknown, currentBody: PortableNode[]): PortableNode[] {`,
  );

  route = replaceRequired(
    route,
    "editable table exclusion from immutable keys",
    `.filter((node) => isRecord(node) && node._type !== "block")`,
    `.filter((node) => isRecord(node) && node._type !== "block" && node._type !== "lessonTable")`,
  );

  route = replaceRequired(
    route,
    "allow table block updates",
    `    if (value._type === "image" && !current) return sanitizeNewImage(value);`,
    `    if (value._type === "lessonTable") {
      if (current && current._type !== "lessonTable") throw new Error("INVALID_EMBEDDED_CONTENT");
      return sanitizeLessonTable(value);
    }

    if (value._type === "image" && !current) return sanitizeNewImage(value);`,
  );

  route = replaceRequired(
    route,
    "table validation error",
    `        "INVALID_IMAGE_ASSET",
      ].includes(error.message)) {`,
    `        "INVALID_IMAGE_ASSET",
        "INVALID_TABLE",
      ].includes(error.message)) {`,
  );
}

if (!css.includes(marker)) {
  css += `

/* ${marker} */
.richEditor figure[data-portable-table="true"] {
  display: block;
  max-width: 100%;
  margin: 22px 0;
  overflow-x: auto;
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 14px;
  background: white;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.richEditor figure[data-portable-table="true"] figcaption {
  min-width: 34rem;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 16%, transparent);
  background: color-mix(in srgb, var(--primary) 5%, white);
  font-weight: 750;
}

.richEditor figure[data-portable-table="true"] table {
  width: 100%;
  min-width: 34rem;
  border-collapse: collapse;
}

.richEditor figure[data-portable-table="true"] th,
.richEditor figure[data-portable-table="true"] td {
  min-width: 8rem;
  padding: 9px 11px;
  border-right: 1px solid color-mix(in srgb, var(--primary) 14%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 14%, transparent);
  vertical-align: top;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.richEditor figure[data-portable-table="true"] th {
  background: color-mix(in srgb, var(--primary) 10%, white);
  font-weight: 750;
}

.richEditor figure[data-portable-table="true"] tr:last-child > * {
  border-bottom: 0;
}

.richEditor figure[data-portable-table="true"] tr > *:last-child {
  border-right: 0;
}

.richEditor figure[data-portable-table="true"] th:focus,
.richEditor figure[data-portable-table="true"] td:focus,
.richEditor figure[data-portable-table="true"] figcaption:focus {
  outline: 2px solid color-mix(in srgb, var(--primary) 65%, transparent);
  outline-offset: -2px;
}

@media (max-width: 720px) {
  .richEditor figure[data-portable-table="true"] {
    margin: 16px 0;
    border-radius: 10px;
  }

  .richEditor figure[data-portable-table="true"] table,
  .richEditor figure[data-portable-table="true"] figcaption {
    min-width: 30rem;
  }
}
`;
}

writeFileSync(portalPath, portal);
writeFileSync(editorPath, editor);
writeFileSync(lessonRoutePath, route);
writeFileSync(cssPath, css);
console.log("Installed responsive lesson tables and direct table copy-paste in the administrator editor.");
