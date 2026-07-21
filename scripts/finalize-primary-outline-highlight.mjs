import {readFileSync, writeFileSync} from "node:fs";

const experiencePath = "app/LessonLearningExperience.tsx";
const cssPath = "app/LessonLearningExperienceQA.module.css";
const marker = "primary-outline-highlight-v1";
const inlineStyle = 'style={isCurrent && heading.level > 2 ? {background: "transparent", borderLeftColor: "transparent"} : undefined}';

let experience = readFileSync(experiencePath, "utf8").replace(/\r\n?/g, "\n");
if (!experience.includes(inlineStyle)) {
  const before = `        data-section-active={isPrimaryActive ? "true" : undefined}
        key={heading.id}`;
  const after = `        data-section-active={isPrimaryActive ? "true" : undefined}
        ${inlineStyle}
        key={heading.id}`;
  if (!experience.includes(before)) throw new Error("Primary outline finalizer could not locate the generated outline button");
  experience = experience.replace(before, after);
}
writeFileSync(experiencePath, experience);

let css = readFileSync(cssPath, "utf8").replace(/\r\n?/g, "\n");
if (!css.includes(marker)) {
  css += `

/* ${marker} */
.workspace .outlineButton[data-level="3"][aria-current="location"],
.workspace .outlineButton[data-level="4"][aria-current="location"] {
  border-left-color: transparent !important;
  background: transparent !important;
}
`;
}
writeFileSync(cssPath, css);

console.log("Nested H3/H4 outline items keep focus rings and active bullets without receiving the primary-section background highlight.");
