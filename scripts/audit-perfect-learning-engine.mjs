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

requireText(renderer, "function planBody", "whole lesson planning is missing");
requireText(renderer, "isNumberedListCluster", "numbered lists are not protected");
requireText(renderer, "looksLikeSentence", "sentence protection is missing");
requireText(renderer, "hasStrongTitleCase", "title confidence is missing");
requireText(renderer, "markerDecision", "marker nesting is missing");
requireText(renderer, "PARENTHESIZED_HEADING", "parenthesized headings are unsupported");
requireText(renderer, "explicitLevel", "Sanity heading priority is missing");
requireText(renderer, 'normal: LearningBlock', "normal blocks are not controlled");
requireText(renderer, 'h1: LearningBlock', "Sanity H1 is not demoted");
requireText(renderer, 'data-source-preserved="true"', "source markers are missing");
requireText(renderer, "...node", "source blocks are not cloned");
requireText(experience, "contentRevision", "Sanity revision is not tracked");
requireText(experience, "revisionChanged", "revision reset is missing");
requireText(experience, "stableSignature", "content signature is missing");
requireText(experience, "storedSignature !== contentSignature", "signature reset is missing");
requireText(experience, "Math.max(current, nextProgress)", "progress can decrease");
requireText(experience, "lastHeading", "last section is not saved");
requireText(experience, "Vazhdo te seksioni i fundit", "resume control is missing");
requireText(experience, "headings.map", "complete lesson map is missing");
requireText(experience, 'aria-current={activeHeading === heading.id ? "location" : undefined}', "active outline state is missing");
requireText(experience, "medical-lesson-learning-v2", "versioned storage is missing");
requireText(experience, "STORAGE_VERSION = 3", "storage schema version is missing");
requireText(installer, "perfect-learning-engine-v2", "portal integration marker is missing");
requireText(installer, "LessonContentRenderer", "production renderer is not installed");
requireText(installer, "contentRevision={selectedLesson._rev}", "Sanity revision is not passed");

forbidText(renderer, "dangerouslySetInnerHTML", "raw HTML replacement is present");
forbidText(renderer, "innerHTML =", "markup mutation is present");
forbidText(renderer, "textContent =", "text mutation is present");
forbidText(renderer, "/api/lessons", "lesson write route is referenced");

const prepare = packageJson.scripts?.["prepare:portal"] || "";
const baseIndex = prepare.indexOf("add-learning-experience.mjs");
const perfectIndex = prepare.indexOf("perfect-learning-engine.mjs");
if (baseIndex < 0 || perfectIndex < 0 || perfectIndex < baseIndex) {
  throw new Error("Perfect learning audit failed: installer order is incorrect");
}

console.log("Perfect learning engine verified for future Sanity content.");
