import { readFileSync, writeFileSync } from "node:fs";

const experiencePath = "app/LessonLearningExperience.tsx";
const experienceCssPath = "app/LessonLearningExperienceQA.module.css";
const portalPaths = ["app/ClassicLearningPortal.tsx", "app/SchoolLearningPortal.tsx"];
const marker = "sanitized-sanity-heading-v1";

function replaceRequired(target, label, before, after) {
  if (!target.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return target.replace(before, after);
}

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

console.log("Lesson headings are sanitized before rendering and before entering the outline.");
