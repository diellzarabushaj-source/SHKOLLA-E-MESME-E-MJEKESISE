import {readFileSync} from "node:fs";

const renderer = readFileSync("app/LessonContentRenderer.tsx", "utf8");
const experience = readFileSync("app/PerfectLessonLearningExperience.tsx", "utf8");
const installer = readFileSync("scripts/perfect-learning-engine.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`Perfect learning audit failed: ${label}`);
}

function forbidText(source, value, label) {
  if (source.includes(value)) throw new Error(`Perfect learning audit failed: ${label}`);
}

requireText(renderer, "function planBody", "whole-lesson planning is missing");
requireText(renderer, "isNumberedListCluster", "numbered lists are not protected from heading inference");
requireText(renderer, "looksLikeSentence", "sentence-like paragraphs are not protected");
requireText(renderer, "explicitLevel", "explicit Sanity heading levels do not have priority");
requireText(renderer, 'normal: LearningBlock', "normal Portable Text blocks are not controlled by the deterministic renderer");
requireText(renderer, 'h1: LearningBlock', "Sanity H1 cannot be demoted below the lesson title");
requireText(renderer, 'data-source-preserved="true"', "source-preservation markers are missing");
requireText(renderer, "...node", "render planning does not clone the source block");
requireText(experience, "contentRevision", "content revision is not tracked");
requireText(experience, "revisionChanged", "updated lessons do not reset stale completion");
requireText(experience, "headings.map", "the lesson map does not include every heading");
requireText(experience, 'aria-current={activeHeading === heading.id ? "location" : undefined}', "active outline accessibility is missing");
requireText(experience, "medical-lesson-learning-v2", "versioned progress storage is missing");
requireText(installer, "perfect-learning-engine-v2", "generated portal integration marker is missing");
requireText(installer, "LessonContentRenderer", "generated portal does not use the whole-lesson renderer");
requireText(installer, "contentRevision={selectedLesson._rev}", "generated portal does not pass the Sanity revision");

forbidText(renderer, "dangerouslySetInnerHTML", "unsafe HTML can replace lesson text");
forbidText(renderer, "innerHTML =", "lesson markup is mutated");
forbidText(renderer, "textContent =", "lesson text is mutated");
forbidText(renderer, "fetch(", "front-end classification performs network writes");
forbidText(renderer, "/api/lessons", "front-end classification can change lesson data");

const prepare = packageJson.scripts?.["prepare:portal"] || "";
const baseIndex = prepare.indexOf("add-learning-experience.mjs");
const perfectIndex = prepare.indexOf("perfect-learning-engine.mjs");
if (baseIndex < 0 || perfectIndex < 0 || perfectIndex < baseIndex) {
  throw new Error("Perfect learning audit failed: the perfect installer must run after the base learning installer");
}

console.log("Perfect learning engine verified: future Sanity lessons receive deterministic hierarchy, exact-text rendering and revision-aware progress.");
