import {readFileSync, writeFileSync} from "node:fs";

const rendererPath = "app/LessonContentRenderer.tsx";
const portalPath = "app/SchoolLearningPortal.tsx";
const rendererMarker = "perfect-whole-lesson-renderer-v2";
const portalMarker = "perfect-learning-engine-v2";

function replaceRequired(source, label, before, after) {
  if (!source.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return source.replace(before, after);
}

let renderer = readFileSync(rendererPath, "utf8");
if (!renderer.includes(rendererMarker)) {
  renderer = replaceRequired(
    renderer,
    "renderer marker and list item type",
    `import learningStyles from "./MarkdownLessonContent.module.css";`,
    `import learningStyles from "./MarkdownLessonContent.module.css";

// ${rendererMarker}`,
  );
  renderer = replaceRequired(
    renderer,
    "Portable Text list item protection",
    `  style?: string;
  children?: PortableSpan[];`,
    `  style?: string;
  listItem?: string;
  children?: PortableSpan[];`,
  );
  renderer = replaceRequired(
    renderer,
    "numbered-list neighbor protection",
    `    if (!node || node._type !== "block" || sourceText(node).includes("\\n")) return null;`,
    `    if (!node || node._type !== "block" || node.listItem || sourceText(node).includes("\\n")) return null;`,
  );
  renderer = replaceRequired(
    renderer,
    "marker hierarchy",
    `function markerDecision(text: string, currentLevel: HeadingLevel | null): {level: HeadingLevel; reason: HeadingReason} | null {
  const letter = text.match(LETTER_HEADING);
  const parenthesized = text.match(PARENTHESIZED_HEADING);
  const label = letter?.[2] || parenthesized?.[2] || "";
  if (!label || !looksLikeTitle(label)) return null;
  return {
    level: nestedLevel(currentLevel),
    reason: letter ? "letter" : "parenthesized",
  };
}`,
    `function markerDecision(text: string, currentLevel: HeadingLevel | null): {level: HeadingLevel; reason: HeadingReason} | null {
  const letter = text.match(LETTER_HEADING);
  const parenthesized = text.match(PARENTHESIZED_HEADING);
  const label = letter?.[2] || parenthesized?.[2] || "";
  if (!label || !looksLikeTitle(label)) return null;
  const topLevelLetter = Boolean(letter && (SECTION_HEADING.test(label) || isUpperHeading(label)));
  const parenthesizedLevel: HeadingLevel = !currentLevel || currentLevel === 2 ? 3 : 4;
  return {
    level: topLevelLetter ? 2 : parenthesized ? parenthesizedLevel : nestedLevel(currentLevel),
    reason: letter ? "letter" : "parenthesized",
  };
}`,
  );
  renderer = replaceRequired(
    renderer,
    "explicit headings before multiline fallback",
    `  if (!node || node._type !== "block") return null;
  const raw = sourceText(node);
  const text = normalized(raw);
  if (!text || raw.includes("\\n") || calloutKind(text) || isDefinition(text)) return null;

  const explicit = explicitLevel(node.style);
  if (explicit) return {level: explicit, reason: "sanity"};`,
    `  if (!node || node._type !== "block" || node.listItem) return null;
  const raw = sourceText(node);
  const text = normalized(raw);
  if (!text || calloutKind(text) || isDefinition(text)) return null;

  const explicit = explicitLevel(node.style);
  if (explicit) return {level: explicit, reason: "sanity"};
  if (raw.includes("\\n")) return null;`,
  );
  renderer = replaceRequired(
    renderer,
    "context-aware learning labels",
    `    return {level: currentLevel && currentLevel >= 3 ? 4 : 3, reason: "label"};`,
    `    return {level: nestedLevel(currentLevel), reason: "label"};`,
  );
  renderer = replaceRequired(
    renderer,
    "context-aware generic titles",
    `  if (looksLikeTitle(text)) {
    return {level: nestedLevel(currentLevel), reason: "phrase"};
  }`,
    `  const previous = body[index - 1];
  const contextual = currentLevel !== null
    || (previous?._type === "block" && looksLikeSentence(sourceText(previous)))
    || (next?._type === "block" && looksLikeSentence(sourceText(next)));
  if (contextual && looksLikeTitle(text)) {
    return {level: nestedLevel(currentLevel), reason: "phrase"};
  }`,
  );
  renderer = replaceRequired(
    renderer,
    "source-keyed exact renderer",
    `function LearningBlock({children, value}: BlockRendererProps) {
  const planned = value._learningHeading;
  if (planned) {
    const Tag = planned.level === 2 ? "h2" : planned.level === 3 ? "h3" : "h4";
    return (
      <Tag
        id={planned.id}
        data-learning-heading="true"
        data-learning-level={planned.level}
        data-heading-source={planned.reason}
        data-source-preserved="true"
      >
        {children}
      </Tag>
    );
  }

  const raw = sourceText(value);
  if (!raw.includes("\\n") && (value.style === undefined || value.style === "normal")) {
    const kind = calloutKind(raw);
    if (kind) {
      return <blockquote className={learningStyles.callout} data-learning-callout={kind} data-source-preserved="true">{children}</blockquote>;
    }
    if (isDefinition(raw)) {
      return <p className={learningStyles.definition} data-learning-definition="true" data-source-preserved="true">{children}</p>;
    }
    return <p data-learning-paragraph="true" data-source-preserved="true">{children}</p>;
  }

  if (value.style === "blockquote") {
    return <blockquote data-source-preserved="true">{children}</blockquote>;
  }

  return <MarkdownLessonBlock value={value}>{children}</MarkdownLessonBlock>;
}`,
    `function sourceKey(value: PortableNode): string | undefined {
  return typeof value._key === "string" ? value._key : undefined;
}

function LearningBlock({children, value}: BlockRendererProps) {
  if (value.listItem) return <>{children}</>;
  const planned = value._learningHeading;
  if (planned) {
    const Tag = planned.level === 2 ? "h2" : planned.level === 3 ? "h3" : "h4";
    const content = planned.reason === "markdown" ? sourceText(value).replace(/^#{1,6}\\s+/, "") : children;
    return (
      <Tag
        id={planned.id}
        data-learning-heading="true"
        data-learning-level={planned.level}
        data-heading-source={planned.reason}
        data-learning-source-key={sourceKey(value)}
        data-source-preserved={planned.reason === "markdown" ? "syntax-only" : "true"}
      >
        {content}
      </Tag>
    );
  }

  const raw = sourceText(value);
  if (!raw.includes("\\n") && (value.style === undefined || value.style === "normal")) {
    const kind = calloutKind(raw);
    if (kind) {
      return <blockquote className={learningStyles.callout} data-learning-callout={kind} data-learning-source-key={sourceKey(value)} data-source-preserved="true">{children}</blockquote>;
    }
    if (isDefinition(raw)) {
      return <p className={learningStyles.definition} data-learning-definition="true" data-learning-source-key={sourceKey(value)} data-source-preserved="true">{children}</p>;
    }
    return <p data-learning-paragraph="true" data-learning-source-key={sourceKey(value)} data-source-preserved="true">{children}</p>;
  }

  if (value.style === "blockquote") {
    return <blockquote data-learning-source-key={sourceKey(value)} data-source-preserved="true">{children}</blockquote>;
  }

  return <MarkdownLessonBlock value={value}>{children}</MarkdownLessonBlock>;
}`,
  );
  writeFileSync(rendererPath, renderer);
}

let portal = readFileSync(portalPath, "utf8");
if (!portal.includes(portalMarker)) {
  if (!portal.includes("lesson-learning-experience-v1")) {
    throw new Error("Perfect learning engine must run after the base learning experience installer.");
  }
  portal = replaceRequired(
    portal,
    "whole-lesson renderer import",
    'import LessonLearningExperience from "./LessonLearningExperience";',
    `import LessonLearningExperience from "./LessonLearningExperience";
import LessonContentRenderer from "./LessonContentRenderer";

// ${portalMarker}`,
  );
  const portableTextCall = '<PortableText value={selectedLesson.body as never} components={portableTextComponents} />';
  if (!portal.includes(portableTextCall)) {
    throw new Error("Perfect learning renderer: lesson PortableText call was not found");
  }
  portal = portal.replaceAll(
    portableTextCall,
    '<LessonContentRenderer body={selectedLesson.body as never} components={portableTextComponents} />',
  );
  writeFileSync(portalPath, portal);
}

process.stdout.write("Installed deterministic whole-lesson hierarchy, content-aware progress and exact-text rendering.\n");
