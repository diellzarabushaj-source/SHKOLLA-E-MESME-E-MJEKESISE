import {readFileSync, writeFileSync} from "node:fs";

const portalFiles = ["app/SchoolLearningPortal.tsx", "app/ClassicLearningPortal.tsx"];
const portalMarker = "lesson-table-portable-v1";

const tableTypes = `type LessonTableColumn = {
  _key?: string;
  heading?: string;
};

type LessonTableCell = {
  _key?: string;
  text?: string;
};

type LessonTableRow = {
  _key?: string;
  cells?: LessonTableCell[];
};

type LessonTableValue = {
  _key?: string;
  _type?: "lessonTable";
  caption?: string;
  showHeader?: boolean;
  columns?: LessonTableColumn[];
  rows?: LessonTableRow[];
};

`;

const tableRenderer = `function LessonTableBlock({ value }: { value: unknown }) {
  const table = value && typeof value === "object" ? value as LessonTableValue : {};
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  const columnCount = Math.max(
    columns.length,
    rows.reduce((maximum, row) => Math.max(maximum, Array.isArray(row.cells) ? row.cells.length : 0), 0),
  );

  if (!columnCount) return null;

  const caption = typeof table.caption === "string" ? table.caption.trim() : "";
  const label = caption || "Tabelë e mësimit";
  const headings = Array.from({ length: columnCount }, (_, index) => {
    const heading = columns[index]?.heading;
    return typeof heading === "string" && heading.trim() ? heading.trim() : \`Kolona \${index + 1}\`;
  });

  return (
    <div data-lesson-table>
      <div data-lesson-table-scroll role="region" aria-label={label} tabIndex={0}>
        <table>
          {caption && <caption>{caption}</caption>}
          {table.showHeader !== false && (
            <thead>
              <tr>
                {headings.map((heading, index) => (
                  <th key={columns[index]?._key || \`column-\${index}\`} scope="col">{heading}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length ? rows.map((row, rowIndex) => (
              <tr key={row._key || \`row-\${rowIndex}\`}>
                {Array.from({ length: columnCount }, (_, cellIndex) => {
                  const cell = Array.isArray(row.cells) ? row.cells[cellIndex] : undefined;
                  const text = typeof cell?.text === "string" ? cell.text : "";
                  return <td key={cell?._key || \`cell-\${rowIndex}-\${cellIndex}\`}>{text}</td>;
                })}
              </tr>
            )) : (
              <tr><td colSpan={columnCount}>Tabela nuk ka ende rreshta.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

`;

function installPortal(file) {
  let source = readFileSync(file, "utf8");
  if (source.includes(portalMarker)) return;

  const importAnchor = `import classic from "./classic-learning.module.css";`;
  if (!source.includes(importAnchor)) throw new Error(`${file}: styles import anchor missing`);
  source = source.replace(
    importAnchor,
    `${importAnchor}\nimport "./lesson-table.css";\n\n// ${portalMarker}`,
  );

  const typeAnchor = `type SanityRecording = {`;
  if (!source.includes(typeAnchor)) throw new Error(`${file}: type anchor missing`);
  source = source.replace(typeAnchor, `${tableTypes}${typeAnchor}`);

  const rendererAnchor = `const portableTextComponents: PortableTextComponents = {`;
  if (!source.includes(rendererAnchor)) throw new Error(`${file}: Portable Text renderer anchor missing`);
  source = source.replace(rendererAnchor, `${tableRenderer}${rendererAnchor}`);

  const typesAnchor = `  types: {\n    image: ({ value }) => {`;
  if (!source.includes(typesAnchor)) throw new Error(`${file}: Portable Text type map anchor missing`);
  source = source.replace(
    typesAnchor,
    `  types: {\n    lessonTable: LessonTableBlock,\n    image: ({ value }) => {`,
  );

  writeFileSync(file, source);
}

for (const file of portalFiles) installPortal(file);

const adminFile = "app/LessonAdminEditor.tsx";
let admin = readFileSync(adminFile, "utf8");
if (!admin.includes("lesson-table-admin-preview-v1")) {
  const adminImport = `import styles from "./LessonAdminEditor.module.css";`;
  if (!admin.includes(adminImport)) throw new Error("Admin editor styles import anchor missing");
  admin = admin.replace(
    adminImport,
    `${adminImport}\nimport "./lesson-table.css";\n\n// lesson-table-admin-preview-v1`,
  );

  const immutableAnchor = `function renderImmutable(node: PortableNode): string {`;
  if (!admin.includes(immutableAnchor)) throw new Error("Admin immutable renderer anchor missing");
  admin = admin.replace(
    immutableAnchor,
    `function portableRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function renderTablePreview(node: PortableNode, key: string, fallbackTitle: string): string {
  const columns = Array.isArray(node.columns) ? node.columns.map(portableRecord) : [];
  const rows = Array.isArray(node.rows) ? node.rows.map(portableRecord) : [];
  const rowWidths = rows.map((row) => Array.isArray(row?.cells) ? row.cells.length : 0);
  const columnCount = Math.max(columns.length, ...rowWidths, 0);
  const caption = typeof node.caption === "string" && node.caption.trim() ? node.caption.trim() : fallbackTitle;
  const headings = Array.from({length: columnCount}, (_, index) => {
    const heading = columns[index]?.heading;
    return typeof heading === "string" && heading.trim() ? heading.trim() : \`Kolona \${index + 1}\`;
  });
  const header = node.showHeader === false ? "" : \`<thead><tr>\${headings.map((heading) => \`<th scope="col">\${escapeHtml(heading)}</th>\`).join("")}</tr></thead>\`;
  const bodyRows = rows.map((row, rowIndex) => {
    const cells = Array.isArray(row?.cells) ? row.cells.map(portableRecord) : [];
    const html = Array.from({length: columnCount}, (_, cellIndex) => {
      const text = cells[cellIndex]?.text;
      return \`<td>\${escapeHtml(typeof text === "string" ? text : "")}</td>\`;
    }).join("");
    return \`<tr data-table-row="\${rowIndex + 1}">\${html}</tr>\`;
  }).join("");

  return \`<figure data-admin-table-preview data-portable-immutable="true" data-portable-key="\${escapeHtml(key)}" contenteditable="false">
    <figcaption><strong>\${escapeHtml(caption)}</strong><span>\${rows.length} rreshta × \${columnCount} kolona · editohet në Sanity</span></figcaption>
    <div data-lesson-table><div data-lesson-table-scroll role="region" aria-label="\${escapeHtml(caption)}" tabindex="0"><table>\${header}<tbody>\${bodyRows}</tbody></table></div></div>
  </figure>\`;
}

${immutableAnchor}`,
  );

  const imageBranch = `  if (type === "image" && imageUrl) {`;
  if (!admin.includes(imageBranch)) throw new Error("Admin image renderer anchor missing");
  admin = admin.replace(
    imageBranch,
    `  if (type === "lessonTable") return renderTablePreview(node, key, title);\n\n${imageBranch}`,
  );

  writeFileSync(adminFile, admin);
}

console.log("Installed structured lesson table rendering for portal and administrator preview.");
