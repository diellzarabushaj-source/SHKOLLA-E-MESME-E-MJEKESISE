import {readFileSync, writeFileSync} from "node:fs";

const path = "app/LessonLearningExperience.tsx";
const marker = "perfect-learning-experience-v2";
let source = readFileSync(path, "utf8");

if (source.includes(marker)) {
  process.stdout.write("Perfect lesson experience is already installed.\n");
  process.exit(0);
}

function replaceRequired(label, before, after) {
  if (!source.includes(before)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(before, after);
}

replaceRequired(
  "experience marker",
  'import styles from "./LessonLearningExperience.module.css";',
  `import styles from "./LessonLearningExperience.module.css";

// ${marker}`,
);

replaceRequired(
  "focusable lesson headings",
  `        heading.id = id;
        heading.dataset.learningHeading = "true";`,
  `        heading.id = id;
        heading.tabIndex = -1;
        heading.dataset.learningHeading = "true";`,
);

replaceRequired(
  "complete lesson outline",
  `  const outline = useMemo(() => headings.slice(0, 60), [headings]);`,
  `  const outline = useMemo(() => headings, [headings]);`,
);

replaceRequired(
  "accessible section jump",
  `    element?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveHeading(id);`,
  `    element?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (element) {
      window.history.replaceState(window.history.state, "", \`#\${id}\`);
      window.setTimeout(() => element.focus({ preventScroll: true }), 350);
    }
    setActiveHeading(id);`,
);

writeFileSync(path, source);
process.stdout.write("Installed the complete lesson map, stable anchors and accessible section focus.\n");
