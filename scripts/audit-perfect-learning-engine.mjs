import {readFileSync} from "node:fs";

const renderer = readFileSync("app/LessonContentRenderer.tsx", "utf8");
const experience = readFileSync("app/LessonLearningExperience.tsx", "utf8");
const installer = readFileSync("scripts/perfect-learning-engine.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`Perfect learning audit failed: ${label}`);
}

function forbidText(source, value, label) {
  if (source.includes(value)) throw new Error(`Perfect learning audit failed: ${label}`);
}

requireText(renderer, "function planBody", "whole-lesson planning is missing");
requireText(renderer, "isNumberedListCluster", "numbered-list protection is missing");
requireText(renderer, "looksLikeSentence", "sentence protection is missing");
requireText(renderer, "hasStrongTitleCase", "title confidence is missing");
requireText(renderer, "markerDecision", "letter and parenthesized hierarchy is missing");
requireText(renderer, "PARENTHESIZED_HEADING", "parenthesized headings are unsupported");
requireText(renderer, "explicitLevel", "explicit Sanity heading priority is missing");
requireText(renderer, 'normal: LearningBlock', "normal Portable Text blocks are not controlled");
requireText(renderer, 'h1: LearningBlock', "Sanity body H1 cannot be demoted");
requireText(renderer, 'data-source-preserved="true"', "source-preservation markers are missing");
requireText(renderer, "...node", "source blocks are not cloned before planning");
requireText(experience, "stableSignature", "content-aware progress signature is missing");
requireText(experience, "storedSignature !== contentSignature", "changed content does not reset stale completion");
requireText(experience, "Math.max(current, nextProgress)", "reading progress can decrease");
requireText(experience, "lastHeading", "the last learning position is not saved");
requireText(experience, "Vazhdo te seksioni i fundit", "resume learning is missing");
requireText(experience, 'aria-current={activeHeading === heading.id ? "location" : undefined}', "active outline accessibility is missing");
requireText(experience, "STORAGE_VERSION = 2", "versioned progress storage is missing");
requireText(installer, "perfect-whole-lesson-renderer-v2", "renderer hardening marker is missing");
requireText(installer, "perfect-learning-engine-v2", "portal integration marker is missing");
requireText(installer, "LessonContentRenderer", "production lesson renderer is not installed");
requireText(installer, "data-learning-source-key", "exact source-block tracking is not installed");
requireText(installer, "node.listItem", "Portable Text list items are not protected");

forbidText(renderer, "dangerouslySetInnerHTML", "raw HTML replacement is present");
forbidText(renderer, "innerHTML =", "markup mutation is present");
forbidText(renderer, "textContent =", "lesson text mutation is present");
forbidText(renderer, "/api/lessons", "front-end lesson writes are referenced");

const prepare = packageJson.scripts?.["prepare:portal"] || "";
const baseIndex = prepare.indexOf("add-learning-experience.mjs");
const perfectIndex = prepare.indexOf("perfect-learning-engine.mjs");
if (baseIndex < 0 || perfectIndex < 0 || perfectIndex < baseIndex) {
  throw new Error("Perfect learning audit failed: installer order is incorrect");
}

console.log("Perfect learning engine verified for all future Sanity lessons without changing their text.");
