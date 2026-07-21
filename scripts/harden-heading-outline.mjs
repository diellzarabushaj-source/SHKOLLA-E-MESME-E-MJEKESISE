import { readFileSync, writeFileSync } from "node:fs";

const experiencePath = "app/LessonLearningExperience.tsx";
const experienceCssPath = "app/LessonLearningExperienceQA.module.css";
const markdownPath = "app/MarkdownLessonContent.tsx";
const portalPaths = ["app/ClassicLearningPortal.tsx", "app/SchoolLearningPortal.tsx"];
const marker = "sanitized-sanity-heading-v1";
const inferenceMarker = "conservative-heading-inference-v1";
const bulletOutlineMarker = "bullet-outline-navigation-v1";

function replaceRequired(target, label, before, after) {
  if (!target.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return target.replace(before, after);
}

let markdown = readFileSync(markdownPath, "utf8").replace(/\r\n?/g, "\n");
if (!markdown.includes(inferenceMarker)) {
  markdown = replaceRequired(
    markdown,
    "generic title punctuation guard",
    "  if (/[.!?;,]$/.test(text)) return false;",
    "  if (/[.!?;,:]$/.test(text)) return false;",
  );

  markdown = replaceRequired(
    markdown,
    "learning label sentence guard",
    "  if (LEARNING_SUBHEADING.test(value) && value.length <= 105 && !/[.!?;]$/.test(value)) {",
    "  if (LEARNING_SUBHEADING.test(value) && value.length <= 105 && !/[.!?;:]$/.test(value) && !SENTENCE_VERB.test(value)) {",
  );

  markdown = replaceRequired(
    markdown,
    "remove colon lead-in heading inference",
    `
  if (/^[^:]{3,85}:$/.test(value) && nextLine.trim()) {
    return { level: context.currentLevel && context.currentLevel >= 3 ? 4 : 3, reason: "colon" };
  }
`,
    "\n",
  );

  markdown = markdown.replaceAll("allowGenericPhrase: true", "allowGenericPhrase: false");
  markdown = markdown.replace(
    "// all-lessons-rich-formatting-v1",
    `// all-lessons-rich-formatting-v1\n// ${inferenceMarker}`,
  );
}
writeFileSync(markdownPath, markdown);

let experience = readFileSync(experiencePath, "utf8").replace(/\r\n?/g, "\n");

if (!experience.includes('from "./LessonHeadingPolicy"')) {
  experience = replaceRequired(
    experience,
    "lesson heading policy import",
    'import qa from "./LessonLearningExperienceQA.module.css";',
    'import qa from "./LessonLearningExperienceQA.module.css";\nimport { isLessonOutlineHeading } from "./LessonHeadingPolicy";',
  );
}

if (!experience.includes("data.learningRejectedHeading")) {
  experience = replaceRequired(
    experience,
    "conservative outline discovery",
    `    const next = Array.from(article.querySelectorAll<HTMLElement>("h2,h3,h4"))
      .filter((heading) => !heading.closest("[data-learning-chrome]"))
      .map((heading, index): LessonHeading | null => {
        const label = (heading.textContent || "").replace(/\\s+/g, " ").trim();
        if (!label) return null;
        const level = Number(heading.tagName.slice(1)) as 2 | 3 | 4;`,
    `    const next = Array.from(article.querySelectorAll<HTMLElement>("h1,h2,h3,h4"))
      .filter((heading) => !heading.closest("[data-learning-chrome]"))
      .map((heading, index): LessonHeading | null => {
        const label = (heading.textContent || "").replace(/\\s+/g, " ").trim();
        if (!label) return null;

        const source = heading.dataset.headingSource || "sanity";
        if (!isLessonOutlineHeading(label, source)) {
          heading.dataset.learningRejectedHeading = "true";
          heading.setAttribute("role", "presentation");
          heading.removeAttribute("aria-level");
          heading.removeAttribute("data-learning-heading");
          heading.removeAttribute("data-learning-level");
          heading.removeAttribute("tabindex");
          return null;
        }

        delete heading.dataset.learningRejectedHeading;
        const tagLevel = Number(heading.tagName.slice(1));
        const level = (tagLevel === 1 ? 2 : tagLevel) as 2 | 3 | 4;
        if (tagLevel === 1) {
          heading.setAttribute("role", "heading");
          heading.setAttribute("aria-level", "2");
        } else {
          if (heading.getAttribute("role") === "presentation") heading.removeAttribute("role");
          heading.removeAttribute("aria-level");
        }`,
  );
}

if (!experience.includes(bulletOutlineMarker)) {
  experience = replaceRequired(
    experience,
    "clean outline labels without changing lesson headings",
    `function headingCode(heading: LessonHeading, index: number): string {
  const explicit = heading.label.match(/^(?:([A-ZÇË]|[IVXLCDM]+)[.)]|(\\d+(?:\\.\\d+)*))\\s*/i);
  return explicit?.[1] || explicit?.[2] || String(index + 1).padStart(2, "0");
}`,
    `function outlineLabel(value: string): string {
  return value
    .replace(/^(?:(?:\\d+(?:\\.\\d+){0,5})\\.?|(?:[A-ZÇË]|[IVXLCDM]{1,7})[.)])\\s+/i, "")
    .trim();
}

// ${bulletOutlineMarker}`,
  );

  experience = replaceRequired(
    experience,
    "outline no longer needs generated numeric indexes",
    "  const outlineItems = outline.map((heading, index) => {",
    "  const outlineItems = outline.map((heading) => {",
  );

  experience = replaceRequired(
    experience,
    "render a bullet and a clean navigation label",
    `        <span className={styles.sectionCode} aria-hidden="true">{headingCode(heading, index)}</span>
        <span>{heading.label}</span>`,
    `        <span className={qa.outlineBullet} aria-hidden="true" />
        <span>{outlineLabel(heading.label)}</span>`,
  );
}

writeFileSync(experiencePath, experience);

let experienceCss = readFileSync(experienceCssPath, "utf8").replace(/\r\n?/g, "\n");
if (!experienceCss.includes(marker)) {
  experienceCss += `

/* ${marker} */
.workspace :global([data-learning-rejected-heading="true"]) {
  margin: 18px 0 12px;
  padding: 0;
  border: 0;
  color: var(--text);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.65;
  letter-spacing: normal;
}
`;
}

if (!experienceCss.includes(bulletOutlineMarker)) {
  experienceCss += `

/* ${bulletOutlineMarker} */
.workspace .outlineButton,
.workspace .outlineButton.outlineLevel2,
.workspace .outlineButton.outlineLevel3,
.workspace .outlineButton.outlineLevel4 {
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 10px;
}

.outlineBullet {
  width: 7px;
  height: 7px;
  margin-top: 0.42em;
  display: block;
  border-radius: 999px;
  background: var(--accent);
  opacity: 0.72;
  transition: opacity 160ms ease, transform 160ms ease;
}

.workspace .outlineButton.outlineLevel2 .outlineBullet {
  width: 8px;
  height: 8px;
  opacity: 1;
}

.workspace .outlineButton.outlineLevel3 .outlineBullet {
  width: 6px;
  height: 6px;
}

.workspace .outlineButton.outlineLevel4 .outlineBullet {
  width: 5px;
  height: 5px;
  opacity: 0.58;
}

.workspace .outlineButton[aria-current="location"] .outlineBullet {
  opacity: 1;
  transform: scale(1.18);
}

@media (prefers-reduced-motion: reduce) {
  .outlineBullet {
    transition: none;
  }
}
`;
}
writeFileSync(experienceCssPath, experienceCss);

for (const portalPath of portalPaths) {
  let portal = readFileSync(portalPath, "utf8").replace(/\r\n?/g, "\n");

  if (!portal.includes('from "./SanitizedLessonHeading"')) {
    portal = replaceRequired(
      portal,
      `${portalPath} sanitized heading import`,
      'import MarkdownLessonBlock from "./MarkdownLessonContent";',
      'import MarkdownLessonBlock from "./MarkdownLessonContent";\nimport SanitizedLessonHeading from "./SanitizedLessonHeading";',
    );
  }

  if (!portal.includes(marker)) {
    portal = replaceRequired(
      portal,
      `${portalPath} Portable Text heading mapping`,
      `  block: {
    normal: ({ children, value }) => (
      <MarkdownLessonBlock value={value as never}>{children}</MarkdownLessonBlock>
    ),
  },`,
      `  block: {
    normal: ({ children, value }) => (
      <MarkdownLessonBlock value={value as never}>{children}</MarkdownLessonBlock>
    ),
    h1: ({ children, value }) => <SanitizedLessonHeading style="h1" value={value as never}>{children}</SanitizedLessonHeading>,
    h2: ({ children, value }) => <SanitizedLessonHeading style="h2" value={value as never}>{children}</SanitizedLessonHeading>,
    h3: ({ children, value }) => <SanitizedLessonHeading style="h3" value={value as never}>{children}</SanitizedLessonHeading>,
    h4: ({ children, value }) => <SanitizedLessonHeading style="h4" value={value as never}>{children}</SanitizedLessonHeading>,
    h5: ({ children, value }) => <SanitizedLessonHeading style="h5" value={value as never}>{children}</SanitizedLessonHeading>,
    h6: ({ children, value }) => <SanitizedLessonHeading style="h6" value={value as never}>{children}</SanitizedLessonHeading>,
  },
  // ${marker}`,
    );
  }

  writeFileSync(portalPath, portal);
}

console.log("Validated lesson headings use clean bullet navigation without changing Sanity text.");
