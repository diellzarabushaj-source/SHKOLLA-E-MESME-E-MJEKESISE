import { readFileSync, writeFileSync } from "node:fs";

const path = "app/LessonLearningExperienceQA.module.css";
const marker = "primary-outline-highlight-v1";
let css = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");

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

writeFileSync(path, css);
console.log("Only the active primary lesson section keeps the sidebar background highlight.");
