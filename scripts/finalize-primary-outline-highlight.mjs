import { readFileSync, writeFileSync } from "node:fs";

const experiencePath = "app/LessonLearningExperience.tsx";
const cssPath = "app/LessonLearningExperienceQA.module.css";
const marker = "primary-outline-highlight-v1";
const inlineStyle = 'style={isCurrent && heading.level > 2 ? { background: "transparent", borderLeftColor: "transparent", transition: "none" } : undefined}';

let experience = readFileSync(experiencePath, "utf8").replace(/\r\n?/g, "\n");
if (!experience.includes(inlineStyle)) {
  const anchor = `        data-section-active={isPrimaryActive ? "true" : undefined}\n        key={heading.id}`;
  const replacement = `        data-section-active={isPrimaryActive ? "true" : undefined}\n        ${inlineStyle}\n        key={heading.id}`;
  if (!experience.includes(anchor)) {
    throw new Error("Primary outline finalizer could not locate the generated outline button");
  }
  experience = experience.replace(anchor, replacement);
}
writeFileSync(experiencePath, experience);

let css = readFileSync(cssPath, "utf8").replace(/\r\n?/g, "\n");
const blockPattern = new RegExp(`\\n?\\n?/\\* ${marker} \\*/[\\s\\S]*?(?=\\n\\n/\\*|$)`, "g");
css = css.replace(blockPattern, "").trimEnd();
css += `

/* ${marker} */
.workspace .outlineButton[data-level="3"][aria-current="location"],
.workspace .outlineButton[data-level="4"][aria-current="location"] {
  border-left-color: transparent !important;
  background: transparent !important;
  transition: none !important;
}
`;
writeFileSync(cssPath, css);

console.log("Only the active primary lesson section keeps the sidebar background highlight; H3/H4 retain focus without a transitional fill.");
