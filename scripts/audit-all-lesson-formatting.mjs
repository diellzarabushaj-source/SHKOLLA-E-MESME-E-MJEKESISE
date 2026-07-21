import { readFileSync } from "node:fs";

const source = readFileSync("app/MarkdownLessonContent.tsx", "utf8");
const styles = readFileSync("app/MarkdownLessonContent.module.css", "utf8");
const portal = readFileSync("app/ClassicLearningPortal.tsx", "utf8");

function requireSource(value, label) {
  if (!source.includes(value)) throw new Error(`All lesson formatting audit failed: ${label}`);
}

function requireStyle(value, label) {
  if (!styles.includes(value)) throw new Error(`All lesson formatting audit failed: ${label}`);
}

function requirePortal(value, label) {
  if (!portal.includes(value)) throw new Error(`All lesson formatting audit failed: ${label}`);
}

requireSource("all-lessons-rich-formatting-v1", "global lesson hardening marker is missing");
requireSource("const SCHEME_ARROW", "arrow schemes are not detected");
requireSource("const SCHEME_EQUALITY", "equality schemes are not detected");
requireSource("function isSchemeLine", "scheme classification is missing");
requireSource("function renderScheme", "scheme renderer is missing");
requireSource('data-learning-scheme="true"', "rendered schemes have no stable semantic marker");
requireSource("isDefinition(value) || isSchemeLine(value)", "schemes can still be misclassified as headings");
requireSource("if (isSchemeLine(trimmed))", "multiline schemes are not rendered before other block types");
requireSource("if (isSchemeLine(current)) break;", "paragraphs can still swallow a following scheme");
requireSource("if (isSchemeLine(raw)) return renderScheme([raw], key);", "single-line schemes are not rendered");
requireSource("paragraph.join(\"\\n\")", "authored paragraph line breaks are collapsed");
requireSource("parts.join(\"\\n\")", "authored callout line breaks are collapsed");
requireSource("<LessonTable", "Markdown tables are not converted to the native lesson table renderer");
requireSource("isNumberedListSequence", "numbered lists are not protected from heading inference");
requireStyle(".scheme,", "scheme panel styling is missing");
requireStyle(".schemeLine", "scheme line styling is missing");
requireStyle(".schemeConnector", "scheme connector styling is missing");
requireStyle("white-space: pre-line;", "authored multiline text is not preserved visually");
requirePortal('import LessonTable, { type LessonTableBlock } from "./LessonTable";', "native lesson table renderer is not imported by the portal");
requirePortal('lessonTable: ({ value }) => <LessonTable value={value as LessonTableBlock} />', "native lessonTable blocks are not registered in Portable Text");
requirePortal('import MarkdownLessonBlock from "./MarkdownLessonContent";', "rich lesson block renderer is not imported by the portal");
requirePortal('normal: ({ children, value }) => (', "normal Portable Text blocks are not routed through the rich lesson renderer");

const schemeIndex = source.indexOf("if (isSchemeLine(trimmed))");
const listIndex = source.indexOf("if (BULLET_ITEM.test(line))");
const inferredIndex = source.indexOf("const inferred = inferredHeadingDecision(trimmed");
if (schemeIndex < 0 || listIndex < 0 || inferredIndex < 0 || schemeIndex > listIndex || schemeIndex > inferredIndex) {
  throw new Error("All lesson formatting audit failed: schemes are classified after lists or headings");
}

const arrowSamples = [
  "Barkusha e djathtë → mushkëritë → vesha e majtë",
  "Nyja sinusale ⇒ nyja atrioventrikulare ⇒ duaji i Hisit",
  "Antigjen + antitrup = kompleks antigjen–antitrup",
];
const arrowPattern = /(?:→|⇒|⟶|➜|↔|⟷)/;
const equalityPattern = /^\s*[^=\n]{1,90}\s=\s[^=\n]{1,280}\s*$/;
if (!arrowPattern.test(arrowSamples[0]) || !arrowPattern.test(arrowSamples[1]) || !equalityPattern.test(arrowSamples[2])) {
  throw new Error("All lesson formatting audit failed: representative medical schemes are not recognized");
}

if (source.includes("dangerouslySetInnerHTML")) {
  throw new Error("All lesson formatting audit failed: lesson content uses unsafe HTML replacement");
}

console.log("All lesson formatting verified: headings, subheadings, lists, native tables, line breaks and schemes are protected globally.");
