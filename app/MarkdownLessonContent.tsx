import { Fragment, type ReactNode } from "react";
import LessonTable, { type LessonTableBlock } from "./LessonTable";
import styles from "./MarkdownLessonContent.module.css";

type PortableSpan = {
  text?: string;
};

type PortableBlockValue = {
  _key?: string;
  children?: PortableSpan[];
};

type MarkdownLessonBlockProps = {
  value: PortableBlockValue;
  children: ReactNode;
};

const TABLE_DIVIDER = /^:?-{3,}:?$/;
const BULLET_ITEM = /^\s*(?:[-*+] |•\s+)(.+)$/;
const NUMBER_ITEM = /^\s*\d+[.)]\s+(.+)$/;
const MARKDOWN_HEADING = /^(#{1,6})\s+(.+)$/;

function sourceText(value: PortableBlockValue): string {
  return (value.children || []).map((child) => child.text || "").join("").replace(/\r\n?/g, "\n");
}

function splitTableRow(line: string): string[] {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isTableDivider(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => TABLE_DIVIDER.test(cell.replace(/\s+/g, "")));
}

function plainInline(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|__/g, "")
    .replace(/`/g, "")
    .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$|[.,;:!?])/g, "$1$2")
    .trim();
}

function inlineNodes(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const token = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+?`|\*[^*\n]+?\*|_[^_\n]+?_)/g;
  let cursor = 0;
  let index = 0;

  for (const match of value.matchAll(token)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(value.slice(cursor, start));
    const current = match[0];
    const key = `${keyPrefix}-inline-${index++}`;

    if (current.startsWith("**") || current.startsWith("__")) {
      nodes.push(<strong key={key}>{current.slice(2, -2)}</strong>);
    } else if (current.startsWith("`")) {
      nodes.push(<code key={key}>{current.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={key}>{current.slice(1, -1)}</em>);
    }
    cursor = start + current.length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes.length ? nodes : [value];
}

function isUpperHeading(line: string): boolean {
  if (line.length < 4 || line.length > 150) return false;
  const letters = line.replace(/[^A-Za-zÇËçëÀ-ž]/g, "");
  if (letters.length < 4) return false;
  return line === line.toLocaleUpperCase("sq-AL");
}

function isLegacySubheading(line: string, nextLine: string): boolean {
  if (line.length > 100 || /[.!?;:]$/.test(line)) return false;
  if (/^\d+\.\d+\.\s+/.test(line)) return true;
  if (/^\d+\.\s+/.test(line) && /^\([^)]{2,80}\)$/.test(nextLine)) return true;
  if (/^\([^)]{2,80}\)$/.test(line)) return false;
  return /^(Rruga|Skema|Rregull|Mnemonikë|Dallimi|Baza|Maja|Faqet|Hemi|Globina|Serumi|Vaksinat|Muri|Valvulat|Trungu|Arteria|Vena|Sinusi|Muskujt|Fijet|Hemostaza|Koagulimi|Fibrinoliza)\b/i.test(line);
}

function shouldParse(raw: string): boolean {
  return (
    /(^|\n)#{1,6}\s+/m.test(raw) ||
    /\n\s*\|[^\n]+\|\s*\n\s*\|?\s*:?-{3,}/m.test(raw) ||
    /(^|\n)\s*•\s+/m.test(raw) ||
    /(^|\n)\s*[-*+]\s+\S/m.test(raw) ||
    raw.split("\n\n").some((part) => isUpperHeading(part.trim()))
  );
}

function renderMarkdown(raw: string, blockKey: string): ReactNode[] {
  const lines = raw.split("\n");
  const output: ReactNode[] = [];
  let index = 0;
  let nodeIndex = 0;
  const nextKey = (type: string) => `${blockKey}-${type}-${nodeIndex++}`;
  const nextNonEmpty = (start: number) => {
    for (let cursor = start; cursor < lines.length; cursor += 1) {
      if (lines[cursor].trim()) return lines[cursor].trim();
    }
    return "";
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      output.push(<hr className={styles.divider} key={nextKey("divider")} />);
      index += 1;
      continue;
    }

    if (trimmed.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const tableKey = nextKey("table");
      const tableRows: Array<{ cells: string[]; header: boolean }> = [
        { cells: splitTableRow(trimmed), header: true },
      ];
      index += 2;
      while (index < lines.length) {
        const row = lines[index].trim();
        if (!row || !row.includes("|")) break;
        tableRows.push({ cells: splitTableRow(row), header: false });
        index += 1;
      }
      const value: LessonTableBlock = {
        _key: tableKey,
        _type: "lessonTable",
        rows: tableRows.map((row, rowIndex) => ({
          _key: `${tableKey}-row-${rowIndex}`,
          _type: "lessonTableRow",
          cells: row.cells.map((cell, cellIndex) => ({
            _key: `${tableKey}-cell-${rowIndex}-${cellIndex}`,
            _type: "lessonTableCell",
            text: plainInline(cell),
            isHeader: row.header,
          })),
        })),
      };
      output.push(<LessonTable key={tableKey} value={value} />);
      continue;
    }

    const heading = trimmed.match(MARKDOWN_HEADING);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const key = nextKey("heading");
      if (level === 1) output.push(<h2 key={key}>{inlineNodes(text, key)}</h2>);
      else if (level === 2) output.push(<h3 key={key}>{inlineNodes(text, key)}</h3>);
      else output.push(<h4 key={key}>{inlineNodes(text, key)}</h4>);
      index += 1;
      continue;
    }

    if (isUpperHeading(trimmed)) {
      const key = nextKey("heading");
      output.push(<h2 key={key}>{inlineNodes(trimmed, key)}</h2>);
      index += 1;
      continue;
    }

    const nextLine = nextNonEmpty(index + 1);
    if (isLegacySubheading(trimmed, nextLine)) {
      const key = nextKey("subheading");
      const Tag = /^\d+\.\s+/.test(trimmed) ? "h4" : "h3";
      output.push(<Tag key={key}>{inlineNodes(trimmed, key)}</Tag>);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, "").trim());
        index += 1;
      }
      const key = nextKey("quote");
      output.push(<blockquote key={key}>{inlineNodes(quote.join(" "), key)}</blockquote>);
      continue;
    }

    if (BULLET_ITEM.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(BULLET_ITEM);
        if (!match) break;
        let item = match[1].trim();
        index += 1;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !BULLET_ITEM.test(lines[index]) && !NUMBER_ITEM.test(lines[index])) {
          item += ` ${lines[index].trim()}`;
          index += 1;
        }
        items.push(item);
      }
      const key = nextKey("list");
      output.push(
        <ul key={key}>
          {items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{inlineNodes(item, `${key}-${itemIndex}`)}</li>)}
        </ul>,
      );
      continue;
    }

    if (NUMBER_ITEM.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(NUMBER_ITEM);
        if (!match) break;
        let item = match[1].trim();
        index += 1;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !BULLET_ITEM.test(lines[index]) && !NUMBER_ITEM.test(lines[index])) {
          item += ` ${lines[index].trim()}`;
          index += 1;
        }
        items.push(item);
      }
      const key = nextKey("list");
      output.push(
        <ol key={key}>
          {items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{inlineNodes(item, `${key}-${itemIndex}`)}</li>)}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current) break;
      if (/^-{3,}$/.test(current) || MARKDOWN_HEADING.test(current) || /^>\s?/.test(current)) break;
      if (BULLET_ITEM.test(lines[index]) || NUMBER_ITEM.test(lines[index])) break;
      if (current.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) break;
      paragraph.push(current);
      index += 1;
    }
    const key = nextKey("paragraph");
    output.push(<p key={key}>{inlineNodes(paragraph.join(" "), key)}</p>);
  }

  return output;
}

export default function MarkdownLessonBlock({ value, children }: MarkdownLessonBlockProps) {
  const raw = sourceText(value);
  if (!shouldParse(raw)) return <p>{children}</p>;

  return (
    <div className={styles.root} data-markdown-lesson-content="true">
      {renderMarkdown(raw, value._key || "lesson-block")}
    </div>
  );
}
