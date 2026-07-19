import { readFileSync } from "node:fs";

const source = readFileSync("app/MarkdownLessonContent.tsx", "utf8");
const styles = readFileSync("app/MarkdownLessonContent.module.css", "utf8");

function requireText(value, label) {
  if (!source.includes(value)) throw new Error(`Heading consistency audit failed: ${label}`);
}

function requireStyle(value, label) {
  if (!styles.includes(value)) throw new Error(`Heading consistency audit failed: ${label}`);
}

function forbidText(value, label) {
  if (source.includes(value)) throw new Error(`Heading consistency audit failed: ${label}`);
}

requireText("type HeadingReason =", "heading decision type is missing");
for (const reason of ["sanity", "markdown", "numbered", "section", "uppercase", "letter", "parenthesized", "label", "colon", "phrase"]) {
  requireText(`| \"${reason}\"`, `heading reason ${reason} is not exposed`);
}
requireText('if (style === "h1" || style === "h2") return { level: 2, reason: "sanity" }', "Sanity H1/H2 are not consistently mapped below the lesson H1");
requireText('if (style === "h3") return { level: 3, reason: "sanity" }', "Sanity H3 is not consistently mapped");
requireText('if (style === "h4" || style === "h5" || style === "h6") return { level: 4, reason: "sanity" }', "Sanity detail headings are not consistently mapped");
requireText("safeNumberedHeading", "numbered headings are not protected from sentence false positives");
requireText("safeMarkerHeading", "letter and parenthesized headings are not classified contextually");
requireText("hasStrongTitleCase", "generic phrases can be promoted without a strong title signal");
requireText("SENTENCE_VERB", "short sentences are not protected from false heading classification");
requireText("data-heading-source={decision.reason}", "rendered headings do not expose their classification reason");
requireText('data-hierarchy-contract="h1-title-h2-section-h3-subsection-h4-detail"', "the lesson hierarchy contract is missing");
requireText('data-source-preserved="true"', "source-preservation markers are missing");
requireText('parts.join("\\n")', "callout lines are being collapsed or rewritten");
requireText('paragraph.join("\\n")', "paragraph lines are being collapsed or rewritten");
requireText('quote.join("\\n")', "quote lines are being collapsed or rewritten");
requireText("isNumberedListSequence", "numbered lists cannot be distinguished from numbered headings");
requireText("looksLikeStandaloneTitle", "simple Sanity text cannot be classified automatically");
requireStyle("white-space: pre-line;", "source line breaks are not preserved visually");

const numberedListIndex = source.indexOf("if (isNumberedListSequence(lines, index))");
const inferredHeadingIndex = source.indexOf("const inferred = inferredHeadingDecision(trimmed");
if (numberedListIndex < 0 || inferredHeadingIndex < 0 || numberedListIndex > inferredHeadingIndex) {
  throw new Error("Heading consistency audit failed: numbered lists are classified after headings");
}

forbidText("Math.random", "heading classification is random");
forbidText("dangerouslySetInnerHTML", "lesson text is replaced through unsafe HTML");
forbidText("textContent =", "lesson text is mutated in the renderer");
forbidText("innerHTML =", "lesson markup is mutated in the renderer");
forbidText("/api/lessons", "the front-end hierarchy attempts to change Sanity content");

console.log("Heading consistency verified: conservative H1/H2/H3/H4 inference preserves all future Sanity text.");
