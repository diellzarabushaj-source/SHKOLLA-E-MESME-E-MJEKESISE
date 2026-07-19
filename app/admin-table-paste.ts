import type { LessonTableBlock, LessonTableCell, LessonTableRow } from "./LessonTable";

const TEXT_BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);
const MAX_TABLES_PER_PASTE = 5;
const MAX_ROWS_PER_TABLE = 100;
const MAX_CELLS_PER_ROW = 30;
const MAX_CELL_TEXT = 6000;

function keyFor(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid.slice(0, 20)}`;
}

function safeSpan(value: unknown): number {
  const number = Number(value);
  if (!Number.isInteger(number)) return 1;
  return Math.min(30, Math.max(1, number));
}

function cleanCellText(value: string): string {
  const text = value
    .replaceAll("\u00a0", " ")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length > MAX_CELL_TEXT) throw new Error("TABLE_CELL_TOO_LARGE");
  return text;
}

function textFromCell(cell: HTMLTableCellElement): string {
  const clone = cell.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
  clone.querySelectorAll("p,div,li").forEach((element) => element.append("\n"));
  clone.querySelectorAll("script,style,iframe,object").forEach((element) => element.remove());
  return cleanCellText(clone.textContent || "");
}

function tableFromElement(table: HTMLTableElement): LessonTableBlock | null {
  const htmlRows = Array.from(table.rows);
  if (!htmlRows.length) return null;
  if (htmlRows.length > MAX_ROWS_PER_TABLE) throw new Error("TABLE_TOO_LARGE");

  const rows: LessonTableRow[] = htmlRows.map((row) => {
    const htmlCells = Array.from(row.cells);
    if (!htmlCells.length || htmlCells.length > MAX_CELLS_PER_ROW) throw new Error("TABLE_TOO_LARGE");
    const inHead = row.parentElement?.tagName === "THEAD";

    const cells: LessonTableCell[] = htmlCells.map((cell) => ({
      _key: keyFor("cell"),
      _type: "lessonTableCell",
      text: textFromCell(cell),
      isHeader: inHead || cell.tagName === "TH",
      rowSpan: safeSpan(cell.rowSpan),
      colSpan: safeSpan(cell.colSpan),
    }));

    return {
      _key: keyFor("row"),
      _type: "lessonTableRow",
      cells,
    };
  });

  const caption = cleanCellText(table.caption?.textContent || "").slice(0, 1000);
  return {
    _key: keyFor("table"),
    _type: "lessonTable",
    ...(caption ? { caption } : {}),
    rows,
  };
}

function tablesFromHtml(html: string): LessonTableBlock[] {
  if (!html.trim()) return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(document.querySelectorAll("table"))
    .filter((table) => !table.parentElement?.closest("table"));

  if (tables.length > MAX_TABLES_PER_PASTE) throw new Error("TOO_MANY_TABLES");
  return tables
    .map((table) => tableFromElement(table as HTMLTableElement))
    .filter((table): table is LessonTableBlock => Boolean(table));
}

function tableFromTsv(text: string): LessonTableBlock[] {
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  if (!normalized.includes("\t")) return [];

  const lines = normalized.split("\n");
  while (lines.length && !lines.at(-1)?.trim()) lines.pop();
  if (!lines.length || lines.length > MAX_ROWS_PER_TABLE) throw new Error("TABLE_TOO_LARGE");

  const rows: LessonTableRow[] = lines.map((line) => {
    const values = line.split("\t");
    if (values.length < 2) throw new Error("INVALID_TABLE_CLIPBOARD");
    if (values.length > MAX_CELLS_PER_ROW) throw new Error("TABLE_TOO_LARGE");

    return {
      _key: keyFor("row"),
      _type: "lessonTableRow",
      cells: values.map((value) => ({
        _key: keyFor("cell"),
        _type: "lessonTableCell",
        text: cleanCellText(value),
        isHeader: false,
        rowSpan: 1,
        colSpan: 1,
      })),
    };
  });

  return [{ _key: keyFor("table"), _type: "lessonTable", rows }];
}

export function clipboardTableBlocks(data: DataTransfer): LessonTableBlock[] {
  const htmlTables = tablesFromHtml(data.getData("text/html"));
  if (htmlTables.length) return htmlTables;
  return tableFromTsv(data.getData("text/plain"));
}

function containsNode(editor: HTMLElement, node: Node): boolean {
  const candidate = node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode;
  return Boolean(candidate && editor.contains(candidate));
}

function activeRange(editor: HTMLElement): Range {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (containsNode(editor, range.commonAncestorContainer)) return range.cloneRange();
  }

  const fallback = document.createRange();
  fallback.selectNodeContents(editor);
  fallback.collapse(false);
  return fallback;
}

function directEditorChild(editor: HTMLElement, node: Node): HTMLElement | null {
  let element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
  while (element && element.parentElement !== editor) element = element.parentElement;
  return element?.parentElement === editor ? element : null;
}

function ensureEditableContent(element: HTMLElement) {
  if (!element.textContent && !element.querySelector("img,br,table")) element.append(document.createElement("br"));
}

function focusAtStart(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertAfter(reference: Node, node: Node) {
  reference.parentNode?.insertBefore(node, reference.nextSibling);
}

function tableElement(block: LessonTableBlock): HTMLElement {
  const figure = document.createElement("figure");
  figure.dataset.portableTable = "true";
  figure.dataset.portableKey = block._key || keyFor("table");

  if (block.caption) {
    const caption = document.createElement("figcaption");
    caption.dataset.tableCaption = "true";
    caption.textContent = block.caption;
    figure.append(caption);
  }

  const table = document.createElement("table");
  const tbody = document.createElement("tbody");
  for (const row of block.rows || []) {
    const tr = document.createElement("tr");
    tr.dataset.tableRowKey = row._key || keyFor("row");
    for (const cell of row.cells || []) {
      const element = document.createElement(cell.isHeader ? "th" : "td");
      element.dataset.tableCellKey = cell._key || keyFor("cell");
      element.dataset.tableHeader = cell.isHeader ? "true" : "false";
      element.rowSpan = safeSpan(cell.rowSpan);
      element.colSpan = safeSpan(cell.colSpan);
      element.textContent = cell.text || "";
      if (!element.textContent) element.append(document.createElement("br"));
      tr.append(element);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  figure.append(table);
  return figure;
}

export function insertTableBlocks(editor: HTMLElement, blocks: LessonTableBlock[]) {
  if (!blocks.length) return;
  const range = activeRange(editor);
  if (!range.collapsed) range.deleteContents();
  const elements = blocks.map(tableElement);
  const directChild = directEditorChild(editor, range.startContainer);

  if (directChild && TEXT_BLOCK_TAGS.has(directChild.tagName)) {
    const trailingRange = range.cloneRange();
    trailingRange.setEnd(directChild, directChild.childNodes.length);
    const trailingContent = trailingRange.extractContents();
    const trailingBlock = directChild.cloneNode(false) as HTMLElement;
    trailingBlock.removeAttribute("data-portable-key");
    trailingBlock.append(trailingContent);
    ensureEditableContent(directChild);
    ensureEditableContent(trailingBlock);

    let anchor: Node = directChild;
    for (const element of elements) {
      insertAfter(anchor, element);
      anchor = element;
    }
    insertAfter(anchor, trailingBlock);
    focusAtStart(trailingBlock);
    return;
  }

  if (directChild) {
    let anchor: Node = directChild;
    for (const element of elements) {
      insertAfter(anchor, element);
      anchor = element;
    }
    const paragraph = document.createElement("p");
    paragraph.append(document.createElement("br"));
    insertAfter(anchor, paragraph);
    focusAtStart(paragraph);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const element of elements) fragment.append(element);
  const paragraph = document.createElement("p");
  paragraph.append(document.createElement("br"));
  fragment.append(paragraph);
  range.insertNode(fragment);
  focusAtStart(paragraph);
}

export function createBlankTableBlock(rows = 3, columns = 3): LessonTableBlock {
  const safeRows = Math.min(10, Math.max(1, Math.floor(rows)));
  const safeColumns = Math.min(10, Math.max(1, Math.floor(columns)));
  return {
    _key: keyFor("table"),
    _type: "lessonTable",
    rows: Array.from({ length: safeRows }, (_, rowIndex) => ({
      _key: keyFor("row"),
      _type: "lessonTableRow",
      cells: Array.from({ length: safeColumns }, () => ({
        _key: keyFor("cell"),
        _type: "lessonTableCell",
        text: "",
        isHeader: rowIndex === 0,
        rowSpan: 1,
        colSpan: 1,
      })),
    })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function portableTableToHtml(node: Record<string, unknown>): string | null {
  if (node._type !== "lessonTable" || !Array.isArray(node.rows)) return null;
  const key = typeof node._key === "string" ? node._key : keyFor("table");
  const caption = typeof node.caption === "string" && node.caption.trim()
    ? `<figcaption data-table-caption="true">${escapeHtml(node.caption.trim())}</figcaption>`
    : "";

  const rows = node.rows.map((rowValue) => {
    const row = rowValue && typeof rowValue === "object" ? rowValue as Record<string, unknown> : {};
    const rowKey = typeof row._key === "string" ? row._key : keyFor("row");
    const cells = Array.isArray(row.cells) ? row.cells : [];
    const cellHtml = cells.map((cellValue) => {
      const cell = cellValue && typeof cellValue === "object" ? cellValue as Record<string, unknown> : {};
      const header = cell.isHeader === true;
      const tag = header ? "th" : "td";
      const cellKey = typeof cell._key === "string" ? cell._key : keyFor("cell");
      const rowSpan = safeSpan(cell.rowSpan);
      const colSpan = safeSpan(cell.colSpan);
      const text = typeof cell.text === "string" ? escapeHtml(cell.text).replaceAll("\n", "<br>") : "";
      return `<${tag} data-table-cell-key="${escapeHtml(cellKey)}" data-table-header="${header ? "true" : "false"}" rowspan="${rowSpan}" colspan="${colSpan}">${text || "<br>"}</${tag}>`;
    }).join("");
    return `<tr data-table-row-key="${escapeHtml(rowKey)}">${cellHtml}</tr>`;
  }).join("");

  return `<figure data-portable-table="true" data-portable-key="${escapeHtml(key)}">${caption}<table><tbody>${rows}</tbody></table></figure>`;
}

export function tablePortableNodeFromElement(element: HTMLElement): LessonTableBlock | null {
  if (element.dataset.portableTable !== "true") return null;
  const table = element.querySelector("table");
  if (!(table instanceof HTMLTableElement)) return null;
  const parsed = tableFromElement(table);
  if (!parsed) return null;

  parsed._key = element.dataset.portableKey || parsed._key;
  const caption = element.querySelector<HTMLElement>("[data-table-caption]")?.textContent || "";
  const cleanCaption = cleanCellText(caption).slice(0, 1000);
  if (cleanCaption) parsed.caption = cleanCaption;
  else delete parsed.caption;

  const htmlRows = Array.from(table.rows);
  parsed.rows = parsed.rows?.map((row, rowIndex) => {
    const htmlRow = htmlRows[rowIndex];
    row._key = htmlRow?.dataset.tableRowKey || row._key;
    row.cells = row.cells?.map((cell, cellIndex) => {
      const htmlCell = htmlRow?.cells[cellIndex];
      cell._key = htmlCell?.dataset.tableCellKey || cell._key;
      cell.isHeader = htmlCell?.tagName === "TH" || htmlCell?.dataset.tableHeader === "true";
      return cell;
    });
    return row;
  });

  return parsed;
}
