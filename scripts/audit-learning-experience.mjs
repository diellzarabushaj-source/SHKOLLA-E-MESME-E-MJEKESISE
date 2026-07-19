import { readFileSync } from "node:fs";

const semantic = readFileSync("app/MarkdownLessonContent.tsx", "utf8");
const experience = readFileSync("app/LessonLearningExperience.tsx", "utf8");
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
requireText(semantic, "inferredHeadingLevel", "plain Sanity headings are not inferred");
requireText(semantic, "explicitHeadingLevel", "native Portable Text heading styles are not preserved");
requireText(semantic, "renderLearningParagraph", "learning callouts and definitions are missing");
requireText(semantic, "children ??", "original Portable Text children are not preserved");
requireText(experience, "Harta e mësimit", "lesson outline is missing");
requireText(experience, "Progresi i leximit", "reading progress is missing");
requireText(experience, "medical-lesson-learning-v1", "local per-lesson progress is missing");
requireText(experience, "Shëno si të përfunduar", "manual completion is missing");
requireText(experience, "visitedCount * 5", "section XP logic is missing");
requireText(portal, "lesson-learning-experience-v1", "generated portal is not integrated");
requireText(portal, "<LessonLearningExperience", "lesson content is not wrapped by the learning layer");
requireText(portal, "<LessonAnnotations", "annotations were removed by the learning layer");
requireText(installer, "non-destructive", "installer does not document non-destructive behavior");
forbidText(experience, "dangerouslySetInnerHTML", "learning layer uses unsafe HTML replacement");
forbidText(experience, "textContent =", "learning layer rewrites lesson text");
forbidText(experience, "innerHTML =", "learning layer rewrites lesson markup");
forbidText(experience, "/api/lessons", "learning layer attempts to mutate lesson content");

const prepare = packageJson.scripts?.["prepare:portal"] || "";
const annotationIndex = prepare.indexOf("add-user-annotations.mjs");
const learningIndex = prepare.indexOf("add-learning-experience.mjs");
if (annotationIndex < 0 || learningIndex < 0 || learningIndex < annotationIndex) {
  throw new Error("Learning experience audit failed: installer must run after lesson annotations.");
}

console.log("Learning experience verified: semantic hierarchy, outline, progress and XP preserve the original Sanity text.");
