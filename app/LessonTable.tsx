import styles from "./LessonTable.module.css";

export type LessonTableCell = {
  _key?: string;
  _type?: "lessonTableCell";
  text?: string;
  isHeader?: boolean;
  rowSpan?: number;
  colSpan?: number;
};

export type LessonTableRow = {
  _key?: string;
  _type?: "lessonTableRow";
  cells?: LessonTableCell[];
};

export type LessonTableBlock = {
  _key?: string;
  _type?: "lessonTable";
  caption?: string;
  rows?: LessonTableRow[];
};

function safeSpan(value: unknown): number | undefined {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 1) return undefined;
  return Math.min(30, number);
}

export default function LessonTable({ value }: { value: LessonTableBlock }) {
  const rows = Array.isArray(value.rows)
    ? value.rows.filter((row) => Array.isArray(row.cells) && row.cells.length > 0)
    : [];

  if (!rows.length) return null;

  return (
    <figure className={styles.wrapper}>
      <div className={styles.scroller} tabIndex={0} role="region" aria-label={value.caption || "Tabela e mësimit"}>
        <table className={styles.table}>
          {value.caption && <caption>{value.caption}</caption>}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row._key || `row-${rowIndex}`}>
                {(row.cells || []).map((cell, cellIndex) => {
                  const key = cell._key || `cell-${rowIndex}-${cellIndex}`;
                  const common = {
                    key,
                    rowSpan: safeSpan(cell.rowSpan),
                    colSpan: safeSpan(cell.colSpan),
                  };

                  return cell.isHeader
                    ? <th {...common}>{cell.text || ""}</th>
                    : <td {...common}>{cell.text || ""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
