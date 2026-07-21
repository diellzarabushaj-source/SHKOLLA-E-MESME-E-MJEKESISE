import { readFileSync, writeFileSync } from "node:fs";

const componentPath = "app/MarkdownLessonContent.tsx";
const cssPath = "app/MarkdownLessonContent.module.css";
const marker = "all-lessons-rich-formatting-v1";

let source = readFileSync(componentPath, "utf8").replace(/\r\n?/g, "\n");
let css = readFileSync(cssPath, "utf8").replace(/\r\n?/g, "\n");

function replaceRequired(target, label, before, after) {
  if (!target.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return target.replace(before, after);
}

function replaceRegexRequired(target, label, pattern, replacement) {
  if (!pattern.test(target)) throw new Error(`${label}: source pattern was not found`);
  return target.replace(pattern, replacement);
}

if (!source.includes(marker)) {
  source = replaceRegexRequired(
    source,
    "scheme constants",
    /(const SENTENCE_VERB = [^\n]+;\n)/,
    (match) => `${match}const SCHEME_ARROW = /(?:→|⇒|⟶|➜|↔|⟷)/;\nconst SCHEME_EQUALITY = /^\\s*[^=\\n]{1,90}\\s=\\s[^=\\n]{1,280}\\s*$/;\n\n// ${marker}\n`,
  );

  const schemeHelpers = [
    "function isSchemeLine(value: string): boolean {",
    "  const text = plainInline(value).replace(/\\s+/g, \" \" ).trim();",
    "  if (!text || text.length > 420) return false;",
    "  return SCHEME_ARROW.test(text) || SCHEME_EQUALITY.test(text);",
    "}",
    "",
    "function renderSchemeLine(value: string, key: string): ReactNode[] {",
    "  const parts = value.split(/(\\s*(?:→|⇒|⟶|➜|↔|⟷|=)\\s*)/).filter(Boolean);",
    "  return parts.map((part, index) => {",
    "    const connector = part.trim();",
    "    if (/^(?:→|⇒|⟶|➜|↔|⟷|=)$/.test(connector)) {",
    "      return <span className={styles.schemeConnector} key={`${key}-connector-${index}`}>{connector}</span>;",
    "    }",
    "    return <span className={styles.schemePart} key={`${key}-part-${index}`}>{inlineNodes(part.trim(), `${key}-part-${index}`)}</span>;",
    "  });",
    "}",
    "",
    "function renderScheme(lines: string[], key: string): ReactNode {",
    "  return (",
    "    <div className={styles.scheme} data-learning-scheme=\"true\" data-source-preserved=\"true\" key={key} role=\"group\" aria-label=\"Skema e mësimit\">",
    "      {lines.map((line, lineIndex) => (",
    "        <div className={styles.schemeLine} key={`${key}-line-${lineIndex}`}>{renderSchemeLine(line, `${key}-line-${lineIndex}`)}</div>",
    "      ))}",
    "    </div>",
    "  );",
    "}",
  ].join("\n");

  source = replaceRequired(
    source,
    "scheme helpers",
    "  return nodes.length ? nodes : [value];\n}\n\nfunction normalizedHeading",
    `  return nodes.length ? nodes : [value];\n}\n\n${schemeHelpers}\n\nfunction normalizedHeading`,
  );

  source = replaceRequired(
    source,
    "protect scheme from standalone title inference",
    "  if (CALLOUT_PREFIX.test(text) || isDefinition(text)) return false;",
    "  if (CALLOUT_PREFIX.test(text) || isDefinition(text) || isSchemeLine(text)) return false;",
  );

  source = replaceRequired(
    source,
    "protect scheme from all heading inference",
    "  if (!value || value.length > 150 || CALLOUT_PREFIX.test(value) || isDefinition(value)) return null;",
    "  if (!value || value.length > 150 || CALLOUT_PREFIX.test(value) || isDefinition(value) || isSchemeLine(value)) return null;",
  );

  source = replaceRequired(
    source,
    "parse a single-line scheme",
    "    isDefinition(raw) ||\n    raw.includes(\"\\n\") ||",
    "    isDefinition(raw) ||\n    isSchemeLine(raw) ||\n    raw.includes(\"\\n\") ||",
  );

  const schemeBranch = [
    "    if (isSchemeLine(trimmed)) {",
    "      const schemeLines: string[] = [];",
    "      while (index < lines.length && isSchemeLine(lines[index].trim())) {",
    "        schemeLines.push(lines[index].trim());",
    "        index += 1;",
    "      }",
    "      const key = nextKey(\"scheme\");",
    "      output.push(renderScheme(schemeLines, key));",
    "      continue;",
    "    }",
    "",
  ].join("\n");

  source = replaceRequired(
    source,
    "render schemes before headings and lists",
    "      output.push(<LessonTable key={tableKey} value={value} />);\n      continue;\n    }\n\n    if (BULLET_ITEM.test(line)) {",
    `      output.push(<LessonTable key={tableKey} value={value} />);\n      continue;\n    }\n\n${schemeBranch}    if (BULLET_ITEM.test(line)) {`,
  );

  source = replaceRequired(
    source,
    "stop callouts before schemes",
    "        if (candidateHeading || BULLET_ITEM.test(lines[index]) || isNumberedListSequence(lines, index)) break;",
    "        if (candidateHeading || isSchemeLine(candidate) || BULLET_ITEM.test(lines[index]) || isNumberedListSequence(lines, index)) break;",
  );

  source = replaceRequired(
    source,
    "stop paragraphs before schemes",
    "      if (current.includes(\"|\") && index + 1 < lines.length && isTableDivider(lines[index + 1])) break;\n      const candidateHeading",
    "      if (current.includes(\"|\") && index + 1 < lines.length && isTableDivider(lines[index + 1])) break;\n      if (isSchemeLine(current)) break;\n      const candidateHeading",
  );

  source = replaceRequired(
    source,
    "render standalone schemes",
    "  if (!raw.includes(\"\\n\")) {\n    const markdownHeading",
    "  if (!raw.includes(\"\\n\")) {\n    if (isSchemeLine(raw)) return renderScheme([raw], key);\n    const markdownHeading",
  );
}

if (!css.includes(marker)) {
  css += `

/* ${marker} */
.scheme,
:global([data-learning-scheme="true"]) {
  margin: 18px 0 25px;
  max-width: 65ch;
  padding: 17px 0;
  display: grid;
  gap: 11px;
  border-block: 1px solid color-mix(in srgb, var(--primary) 24%, var(--line));
  background: transparent;
}

.schemeLine {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 10px;
  color: var(--text);
  font-size: 1rem;
  font-weight: 760;
  line-height: 1.62;
}

.schemePart {
  min-width: 0;
}

.schemeConnector {
  flex: 0 0 auto;
  display: inline;
  padding: 0 2px;
  color: var(--primary);
  font-weight: 950;
  line-height: inherit;
}

@media (max-width: 720px) {
  .scheme,
  :global([data-learning-scheme="true"]) {
    padding: 14px 0;
  }

  .schemeLine {
    gap: 6px 8px;
    font-size: 0.95rem;
  }

}
`;
}

writeFileSync(componentPath, source);
writeFileSync(cssPath, css);
console.log("All populated lessons use protected headings, lists, tables and visual schemes.");
