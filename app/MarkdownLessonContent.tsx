import { type ReactNode } from "react";
import LessonTable, { type LessonTableBlock } from "./LessonTable";
import styles from "./MarkdownLessonContent.module.css";

type PortableSpan = {
  text?: string;
};

type PortableBlockValue = {
  _key?: string;
  style?: string;
  children?: PortableSpan[];
};

type MarkdownLessonBlockProps = {
  value: PortableBlockValue;
  children: ReactNode;
};

type HeadingLevel = 2 | 3 | 4;
type HeadingReason = "sanity" | "markdown" | "numbered" | "section" | "uppercase" | "label" | "colon" | "phrase";
type HeadingDecision = {
  level: HeadingLevel;
  reason: HeadingReason;
};
type HeadingContext = {
  allowGenericPhrase?: boolean;
  currentLevel?: HeadingLevel | null;
  previousBlank?: boolean;
  nextBlank?: boolean;
};
type CalloutKind = "remember" | "warning" | "logic" | "definition" | "example" | "comparison";

const TABLE_DIVIDER = /^:?-{3,}:?$/;
const BULLET_ITEM = /^\s*(?:[-*+] |•\s+)(.+)$/;
const NUMBER_ITEM = /^\s*\d+[.)]\s+(.+)$/;
const MARKDOWN_HEADING = /^(#{1,6})\s+(.+)$/;
const NUMBERED_HEADING = /^(\d+(?:\.\d+){0,5})\.?\s+(.+)$/;
const LETTER_HEADING = /^(?:[A-ZÇË]|[IVXLCDM]{1,7})[.)]\s+(.+)$/;
const SECTION_HEADING = /^(KAPITULLI|PJESA|NJËSIA|TEMA|SEKSIONI)\b/i;
const CALLOUT_PREFIX = /^(Mbaje mend|Kujdes|Rregull(?:i)?|Mnemonikë|Logjika(?: kryesore)?|Përkufizim(?:i)?|Shembull|Dallimi|Krahasimi|Rëndësi(?:a)?|Pika kryesore)\s*:?\s*[–—-]?\s*/i;
const LEARNING_SUBHEADING = /^(Rruga|Skema|Rregull|Mnemonikë|Dallimi|Krahasimi|Përkufizimi|Baza|Maja|Faqet|Hemi|Globina|Serumi|Vaksinat|Muri|Valvulat|Trungu|Arteria|Vena|Sinusi|Muskujt|Fijet|Hemostaza|Koagulimi|Fibrinoliza|Funksioni|Ndërtimi|Përbërja|Ndarja|Klasifikimi|Roli|Rëndësia|Karakteristikat|Mekanizmi|Llojet|Pjesët|Pozita|Forma|Madhësia|Qarkullimi|Furnizimi|Inervimi|Veprimi|Fazat|Shkaqet|Pasojat|Simptomat|Diagnoza|Trajtimi|Parandalimi)\b/i;
const SENTENCE_VERB = /\b(është|janë|ishte|ishin|ka|kanë|duhet|mund|përfaqëson|përfaqësojnë|përbëhet|përbëhen|ndërtohet|ndërtohen|shërben|shërbejnë|ndodhet|ndodhen|quhet|quhen|kalon|kalojnë|lidh|lidhen|studion|studiojnë|kryen|kryejnë|siguron|sigurojnë|formon|formojnë|përçon|përçojnë|transporton|transportojnë)\b/i;

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

function normalizedHeading(value: string): string {
  return plainInline(value).replace(/^#{1,6}\s+/, "").replace(/\s+/g, " ").trim();
}

function headingId(value: string, fallback: string): string {
  const slug = normalizedHeading(value)
    .toLocaleLowerCase("sq-AL")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9çë]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `seksioni-${slug || fallback.replace(/[^a-zA-Z0-9-]/g, "-")}`;
}

function isUpperHeading(line: string): boolean {
  if (line.length < 4 || line.length > 150) return false;
  const letters = line.replace(/[^A-Za-zÇËçëÀ-ž]/g, "");
  if (letters.length < 4) return false;
  return line === line.toLocaleUpperCase("sq-AL");
}

function explicitHeadingDecision(style?: string): HeadingDecision | null {
  if (style === "h1" || style === "h2") return { level: 2, reason: "sanity" };
  if (style === "h3") return { level: 3, reason: "sanity" };
  if (style === "h4" || style === "h5" || style === "h6") return { level: 4, reason: "sanity" };
  return null;
}

function markdownHeadingDecision(value: string): { decision: HeadingDecision; text: string } | null {
  const match = value.trim().match(MARKDOWN_HEADING);
  if (!match) return null;
  const depth = match[1].length;
  return {
    decision: { level: depth === 1 ? 2 : depth === 2 ? 3 : 4, reason: "markdown" },
    text: match[2].trim(),
  };
}

function calloutKind(value: string): CalloutKind | null {
  const match = normalizedHeading(value).match(CALLOUT_PREFIX);
  const label = match?.[1]?.toLocaleLowerCase("sq-AL") || "";
  if (!label) return null;
  if (label.startsWith("kujdes")) return "warning";
  if (label.startsWith("logjika") || label.startsWith("rregull") || label.startsWith("mnemonik")) return "logic";
  if (label.startsWith("përkufiz")) return "definition";
  if (label.startsWith("shembull")) return "example";
  if (label.startsWith("dallim") || label.startsWith("krahasim")) return "comparison";
  return "remember";
}

function isDefinition(value: string): boolean {
  const match = normalizedHeading(value).match(/^([^:]{2,55}):\s+(.{10,})$/);
  if (!match) return false;
  const term = match[1].trim();
  return !/https?|www\.|@/.test(term) && term.split(/\s+/).length <= 8 && !/^\d+$/.test(term) && !CALLOUT_PREFIX.test(term);
}

function looksLikeStandaloneTitle(value: string): boolean {
  const text = normalizedHeading(value);
  if (text.length < 3 || text.length > 88) return false;
  if (/^[a-zçë]/.test(text)) return false;
  if (/[.!?;,]$/.test(text)) return false;
  if (/https?:|www\.|@/.test(text)) return false;
  if (CALLOUT_PREFIX.test(text) || isDefinition(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 11) return false;
  if (SENTENCE_VERB.test(text)) return false;
  return /[A-Za-zÇËçëÀ-ž]/.test(text);
}

function inferredHeadingDecision(line: string, nextLine = "", context: HeadingContext = {}): HeadingDecision | null {
  const value = normalizedHeading(line);
  if (!value || value.length > 150 || CALLOUT_PREFIX.test(value) || isDefinition(value)) return null;

  const numbered = value.match(NUMBERED_HEADING);
  if (numbered && !/[!?;]$/.test(numbered[2])) {
    const depth = numbered[1].split(".").length;
    return { level: depth === 1 ? 2 : depth === 2 ? 3 : 4, reason: "numbered" };
  }

  if (SECTION_HEADING.test(value) || LETTER_HEADING.test(value)) return { level: 2, reason: "section" };
  if (isUpperHeading(value)) return { level: 2, reason: "uppercase" };

  if (LEARNING_SUBHEADING.test(value) && value.length <= 105 && !/[.!?;]$/.test(value)) {
    return { level: context.currentLevel && context.currentLevel >= 3 ? 4 : 3, reason: "label" };
  }

  if (/^[^:]{3,85}:$/.test(value) && nextLine.trim()) {
    return { level: context.currentLevel && context.currentLevel >= 3 ? 4 : 3, reason: "colon" };
  }

  const separated = context.previousBlank || context.nextBlank;
  if (context.allowGenericPhrase && separated && looksLikeStandaloneTitle(value)) {
    const level: HeadingLevel = context.currentLevel === null || context.currentLevel === undefined
      ? 2
      : context.currentLevel === 2
        ? 3
        : 4;
    return { level, reason: "phrase" };
  }

  return null;
}

function renderHeading(value: string, key: string, decision: HeadingDecision, children?: ReactNode): ReactNode {
  const Tag = decision.level === 2 ? "h2" : decision.level === 3 ? "h3" : "h4";
  return (
    <Tag
      id={headingId(value, key)}
      key={key}
      data-learning-heading="true"
      data-learning-level={decision.level}
      data-heading-source={decision.reason}
    >
      {children ?? inlineNodes(value, key)}
    </Tag>
  );
}

function renderLearningParagraph(value: string, key: string, children?: ReactNode): ReactNode {
  const kind = calloutKind(value);
  if (kind) {
    return (
      <blockquote className={styles.callout} data-learning-callout={kind} data-source-preserved="true" key={key}>
        {children ?? inlineNodes(value, key)}
      </blockquote>
    );
  }

  if (isDefinition(value)) {
    return <p className={styles.definition} data-learning-definition="true" data-source-preserved="true" key={key}>{children ?? inlineNodes(value, key)}</p>;
  }

  return <p data-learning-paragraph="true" data-source-preserved="true" key={key}>{children ?? inlineNodes(value, key)}</p>;
}

function shouldParse(raw: string, style?: string): boolean {
  return Boolean(
    explicitHeadingDecision(style) ||
    markdownHeadingDecision(raw) ||
    inferredHeadingDecision(raw, "", { allowGenericPhrase: true, currentLevel: 2, previousBlank: true, nextBlank: true }) ||
    calloutKind(raw) ||
    isDefinition(raw) ||
    raw.includes("\n") ||
    /(^|\n)\s*•\s+/m.test(raw) ||
    /(^|\n)\s*[-*+]\s+\S/m.test(raw)
  );
}

function isNumberedListSequence(lines: string[], index: number): boolean {
  if (!NUMBER_ITEM.test(lines[index] || "")) return false;
  return NUMBER_ITEM.test(lines[index - 1] || "") || NUMBER_ITEM.test(lines[index + 1] || "");
}

function renderMarkdown(raw: string, blockKey: string): ReactNode[] {
  const lines = raw.split("\n");
  const output: ReactNode[] = [];
  let index = 0;
  let nodeIndex = 0;
  let currentLevel: HeadingLevel | null = null;
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
      const tableRows: Array<{ cells: string[]; header: boolean }> = [{ cells: splitTableRow(trimmed), header: true }];
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

    if (BULLET_ITEM.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(BULLET_ITEM);
        if (!match) break;
        let item = match[1];
        index += 1;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !BULLET_ITEM.test(lines[index]) && !NUMBER_ITEM.test(lines[index])) {
          item += `\n${lines[index].trim()}`;
          index += 1;
        }
        items.push(item);
      }
      const key = nextKey("list");
      output.push(
        <ul data-learning-list="unordered" data-source-preserved="true" key={key}>
          {items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{inlineNodes(item, `${key}-${itemIndex}`)}</li>)}
        </ul>,
      );
      continue;
    }

    if (isNumberedListSequence(lines, index)) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(NUMBER_ITEM);
        if (!match) break;
        let item = match[1];
        index += 1;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !BULLET_ITEM.test(lines[index]) && !NUMBER_ITEM.test(lines[index])) {
          item += `\n${lines[index].trim()}`;
          index += 1;
        }
        items.push(item);
      }
      const key = nextKey("list");
      output.push(
        <ol data-learning-list="ordered" data-source-preserved="true" key={key}>
          {items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{inlineNodes(item, `${key}-${itemIndex}`)}</li>)}
        </ol>,
      );
      continue;
    }

    const markdownHeading = markdownHeadingDecision(trimmed);
    if (markdownHeading) {
      const key = nextKey("heading");
      output.push(renderHeading(markdownHeading.text, key, markdownHeading.decision));
      currentLevel = markdownHeading.decision.level;
      index += 1;
      continue;
    }

    const nextLine = nextNonEmpty(index + 1);
    const inferred = inferredHeadingDecision(trimmed, nextLine, {
      allowGenericPhrase: true,
      currentLevel,
      previousBlank: index === 0 || !lines[index - 1].trim(),
      nextBlank: index === lines.length - 1 || !lines[index + 1].trim(),
    });
    if (inferred) {
      const key = nextKey("heading");
      output.push(renderHeading(trimmed, key, inferred));
      currentLevel = inferred.level;
      index += 1;
      continue;
    }

    const callout = calloutKind(trimmed);
    if (callout) {
      const parts: string[] = [trimmed];
      index += 1;
      while (index < lines.length && lines[index].trim()) {
        const candidate = lines[index].trim();
        const candidateHeading = inferredHeadingDecision(candidate, nextNonEmpty(index + 1), {
          allowGenericPhrase: true,
          currentLevel,
          previousBlank: false,
          nextBlank: index === lines.length - 1 || !lines[index + 1].trim(),
        });
        if (candidateHeading || BULLET_ITEM.test(lines[index]) || isNumberedListSequence(lines, index)) break;
        parts.push(candidate);
        index += 1;
      }
      const key = nextKey("callout");
      output.push(renderLearningParagraph(parts.join("\n"), key));
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      const key = nextKey("quote");
      output.push(<blockquote data-source-preserved="true" key={key}>{inlineNodes(quote.join("\n"), key)}</blockquote>);
      continue;
    }

    if (NUMBER_ITEM.test(line)) {
      const match = line.match(NUMBER_ITEM);
      if (match) {
        const key = nextKey("list");
        output.push(
          <ol data-learning-list="ordered" data-source-preserved="true" key={key} start={Number.parseInt(line, 10) || 1}>
            <li>{inlineNodes(match[1], `${key}-0`)}</li>
          </ol>,
        );
        index += 1;
        continue;
      }
    }

    const paragraph: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current) break;
      if (/^-{3,}$/.test(current) || MARKDOWN_HEADING.test(current) || /^>\s?/.test(current)) break;
      if (BULLET_ITEM.test(lines[index]) || isNumberedListSequence(lines, index)) break;
      if (current.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) break;
      const candidateHeading = inferredHeadingDecision(current, nextNonEmpty(index + 1), {
        allowGenericPhrase: true,
        currentLevel,
        previousBlank: false,
        nextBlank: index === lines.length - 1 || !lines[index + 1].trim(),
      });
      if (candidateHeading || calloutKind(current)) break;
      paragraph.push(current);
      index += 1;
    }
    const key = nextKey("paragraph");
    output.push(renderLearningParagraph(paragraph.join("\n"), key));
  }

  return output;
}

export default function MarkdownLessonBlock({ value, children }: MarkdownLessonBlockProps) {
  const raw = sourceText(value);
  const key = value._key || "lesson-block";
  const explicit = explicitHeadingDecision(value.style);

  if (explicit) return renderHeading(raw, key, explicit, children);
  if (!shouldParse(raw, value.style)) return <p data-learning-paragraph="true" data-source-preserved="true">{children}</p>;

  if (!raw.includes("\n")) {
    const markdownHeading = markdownHeadingDecision(raw);
    if (markdownHeading) return renderHeading(markdownHeading.text, key, markdownHeading.decision);
    const inferred = inferredHeadingDecision(raw, "", { allowGenericPhrase: true, currentLevel: 2, previousBlank: true, nextBlank: true });
    if (inferred) return renderHeading(raw, key, inferred, children);
    return renderLearningParagraph(raw, key, children);
  }

  return (
    <div className={styles.root} data-markdown-lesson-content="true" data-hierarchy-contract="h1-title-h2-section-h3-subsection-h4-detail">
      {renderMarkdown(raw, key)}
    </div>
  );
}
