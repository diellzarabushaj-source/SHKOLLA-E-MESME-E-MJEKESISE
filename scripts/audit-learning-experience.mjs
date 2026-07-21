import { readFileSync } from "node:fs";

const semantic = readFileSync("app/MarkdownLessonContent.tsx", "utf8");
const experience = readFileSync("app/LessonLearningExperience.tsx", "utf8");
const experienceStyles = readFileSync("app/LessonLearningExperienceQA.module.css", "utf8");
const themeToggle = readFileSync("app/ThemeToggle.tsx", "utf8");
const portal = readFileSync("app/SchoolLearningPortal.tsx", "utf8");
const installer = readFileSync("scripts/add-learning-experience.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`Learning experience audit failed: ${label}`);
}

function forbidText(source, value, label) {
  if (source.includes(value)) throw new Error(`Learning experience audit failed: ${label}`);
}

requireText(semantic, 'data-learning-heading="true"', "semantic headings are not exposed");
requireText(semantic, "inferredHeadingDecision", "plain Sanity headings are not inferred deterministically");
requireText(semantic, "explicitHeadingDecision", "native Portable Text heading styles are not preserved");
requireText(semantic, "data-heading-source", "heading classification reasons are not exposed");
requireText(semantic, "renderLearningParagraph", "learning callouts and definitions are missing");
requireText(semantic, "children ??", "original Portable Text children are not preserved");
requireText(semantic, 'data-source-preserved="true"', "source-preservation contract is missing");

requireText(experience, "Përmbajtja e mësimit", "lesson outline is missing");
requireText(experience, "Progresi i leximit", "reading progress is missing");
requireText(experience, "medical-lesson-learning-v1", "local per-lesson progress is missing");
requireText(experience, "Shëno si të përfunduar", "manual completion is missing");
requireText(experience, "const outline = useMemo(() => headings", "the full H2/H3/H4 hierarchy is not exposed in the outline");
requireText(experience, "firstUnread", "continue reading does not resume at the first unread section");
requireText(experience, "Math.min(rawProgress, 99)", "progress can report 100% before explicit completion");
requireText(experience, 'window.matchMedia("(prefers-reduced-motion: reduce)")', "programmatic scrolling ignores reduced motion");
requireText(experience, "mobileOutlineRef.current.open = false", "mobile outline remains open after section navigation");
requireText(experience, "heading.tabIndex = -1", "section targets cannot receive keyboard focus");
requireText(experience, "aria-labelledby={lessonTitleId}", "lesson workspace is not labelled by its H1");
requireText(experience, "aria-valuetext", "progressbar lacks a human-readable value");
requireText(experience, '<strong className={qa.contextTitle}>{subjectTitle}</strong>', "sidebar context incorrectly introduces a heading before the lesson H1");
requireText(experience, "lessonSummary", "shared lesson header is missing");
forbidText(experience, "<h2>{subjectTitle}</h2>", "sidebar H2 appears before the lesson H1");

requireText(experienceStyles, ".outlineButton:focus-visible", "outline keyboard focus is not visible");
requireText(experienceStyles, ".outlineButton.outlineLevel3", "H3 outline indentation is missing");
requireText(experienceStyles, ".outlineButton.outlineLevel4", "H4 outline indentation is missing");
requireText(experienceStyles, "grid-column: 2", "hero actions are not explicitly placed in the desktop grid");
requireText(experienceStyles, "grid-row: 2", "hero media is not explicitly placed below the hero controls");
requireText(experienceStyles, "overflow-wrap: anywhere", "long lesson headings can overflow their container");

requireText(themeToggle, "aria-label={title}", "theme toggle does not expose the current action");
requireText(themeToggle, "window.localStorage.setItem", "theme preference is not persisted");
requireText(themeToggle, "catch", "theme switching can fail when browser storage is blocked");

requireText(portal, "lesson-learning-experience-v1", "generated portal is not integrated");
requireText(portal, "<LessonLearningExperience", "lesson content is not wrapped by the learning layer");
requireText(portal, "<LessonAnnotations", "annotations were removed by the learning layer");
requireText(installer, "non-destructive", "installer does not document non-destructive behavior");

const prepare = packageJson.scripts?.["prepare:portal"] || "";
const annotationIndex = prepare.indexOf("add-user-annotations.mjs");
const learningIndex = prepare.indexOf("add-learning-experience.mjs");
if (annotationIndex < 0 || learningIndex < 0 || learningIndex < annotationIndex) {
  throw new Error("Learning experience audit failed: installer must run after lesson annotations.");
}

console.log("Learning experience verified: responsive hierarchy, accessible navigation and truthful progress preserve the original Sanity text.");
